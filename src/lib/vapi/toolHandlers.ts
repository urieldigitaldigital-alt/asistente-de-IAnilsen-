import type { SupabaseClient } from "@supabase/supabase-js";

import { findAvailability, formatLocal, isWithinBusinessHours, parseLocalDateTime, type BusyRange } from "@/lib/availability";
import { deleteCalendarEvent, getFreeBusy, insertCalendarEvent } from "@/lib/google/calendar";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  checkAvailabilitySchema,
  createOrderSchema,
  getPropertiesSchema,
  logInquirySchema,
  requestHumanHandoffSchema,
  reserveTableSchema,
  scheduleVisitSchema,
} from "@/lib/validation";
import { TOOL_NAMES } from "@/lib/retell/tools";
import type { AgentConfig, Clinic, Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface ToolHandlerContext {
  admin: AdminClient;
  clinic: Clinic;
  config: AgentConfig;
  /** id de la fila en `calls` para esta llamada (ya existe gracias al upsert previo al dispatch). */
  callRowId: string | null;
}

/**
 * El modelo a veces "recuerda" un año de su corpus de entrenamiento en vez
 * del año real (p. ej. pide "2024-08-24" cuando hoy es 2026). Si la fecha
 * pedida cae en el pasado, la adelantamos año a año hasta la próxima
 * ocurrencia futura de ese mismo mes/día/hora — asume que un cliente que
 * llama nunca quiere agendar algo que ya pasó.
 */
function assumeFutureIntent(date: Date, now: Date): Date {
  let candidate = date;
  let guard = 0;
  while (candidate.getTime() < now.getTime() - 24 * 60 * 60_000 && guard < 6) {
    const next = new Date(candidate);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    candidate = next;
    guard += 1;
  }
  return candidate;
}

function findServiceDuration(config: AgentConfig, treatment?: string): number {
  if (treatment) {
    const match = config.services.find((service) => service.name.toLowerCase() === treatment.toLowerCase());
    if (match) return match.duration_minutes;
  }
  return config.services[0]?.duration_minutes ?? 30;
}

async function getScheduledLocalBusy(ctx: ToolHandlerContext, from: Date, to: Date): Promise<BusyRange[]> {
  const { data } = await ctx.admin
    .from("appointments")
    .select("start_time, end_time")
    .eq("clinic_id", ctx.clinic.id)
    .eq("status", "scheduled")
    .gte("start_time", from.toISOString())
    .lte("start_time", to.toISOString());

  return (data ?? []).map((row) => ({ start: new Date(row.start_time), end: new Date(row.end_time) }));
}

async function handleCheckAvailability(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = checkAvailabilitySchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "No entendí los datos para consultar disponibilidad. ¿Puede repetir el tratamiento y la fecha/hora deseadas?";
  }
  const { treatment, datetime, durationMinutes, daysAhead } = parsed.data;

  const duration = durationMinutes ?? findServiceDuration(ctx.config, treatment);
  const now = new Date();
  const requestedStart = datetime
    ? assumeFutureIntent(parseLocalDateTime(datetime, ctx.clinic.timezone), now)
    : undefined;
  const windowEnd = new Date(now.getTime() + (daysAhead ?? 14) * 24 * 60 * 60_000);

  const [googleBusy, localBusy] = await Promise.all([
    getFreeBusy(ctx.admin, ctx.clinic.id, now, windowEnd),
    getScheduledLocalBusy(ctx, now, windowEnd),
  ]);

  const result = findAvailability({
    requestedStart,
    durationMinutes: duration,
    timeZone: ctx.clinic.timezone,
    businessHours: ctx.config.business_hours,
    busy: [...googleBusy, ...localBusy],
    daysAhead: daysAhead ?? 14,
    now,
  });

  if (result.requestedAvailable && requestedStart) {
    return JSON.stringify({
      available: true,
      iso: requestedStart.toISOString(),
      local: formatLocal(requestedStart, ctx.clinic.timezone),
    });
  }

  return JSON.stringify({ available: false, alternatives: result.alternatives });
}

async function handleBookAppointment(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = bookAppointmentSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "Faltan datos para agendar la cita. Necesito fecha y hora, duración, nombre completo, teléfono y tratamiento.";
  }
  const data = parsed.data;
  const start = assumeFutureIntent(parseLocalDateTime(data.datetime, ctx.clinic.timezone), new Date());
  const end = new Date(start.getTime() + data.durationMinutes * 60_000);

  let googleEventId: string | null = null;
  let googleEventLink: string | null = null;
  try {
    const event = await insertCalendarEvent(ctx.admin, ctx.clinic.id, {
      summary: `${data.treatment} — ${data.patientName}`,
      description: data.notes,
      start,
      end,
      timeZone: ctx.clinic.timezone,
      attendeeEmail: data.patientEmail,
    });
    googleEventId = event.id;
    googleEventLink = event.htmlLink;
  } catch (err) {
    console.error("No se pudo crear el evento en Google Calendar:", err);
  }

  const { data: appointment, error } = await ctx.admin
    .from("appointments")
    .insert({
      clinic_id: ctx.clinic.id,
      call_id: ctx.callRowId,
      google_event_id: googleEventId,
      google_event_link: googleEventLink,
      patient_name: data.patientName,
      patient_phone: data.patientPhone,
      patient_email: data.patientEmail ?? null,
      treatment: data.treatment,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_new_patient: data.isNewPatient,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    if (googleEventId) await deleteCalendarEvent(ctx.admin, ctx.clinic.id, googleEventId);
    if (error?.code === "23505") {
      return "Ese horario se acaba de ocupar. ¿Buscamos otro horario cercano?";
    }
    console.error("Error al guardar la cita:", error);
    return "No pude guardar la cita, intentemos de nuevo en un momento.";
  }

  return JSON.stringify({
    booked: true,
    appointmentId: appointment.id,
    local: formatLocal(start, ctx.clinic.timezone),
  });
}

async function handleCancelAppointment(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = cancelAppointmentSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "No entendí qué cita cancelar. ¿Me da el nombre y la fecha aproximada?";
  }
  const { eventId, patientName, patientPhone, datetime } = parsed.data;
  if (!eventId && !patientName && !patientPhone && !datetime) {
    return "Necesito al menos el nombre, teléfono o la fecha de la cita para poder cancelarla.";
  }

  let query = ctx.admin.from("appointments").select("*").eq("clinic_id", ctx.clinic.id).eq("status", "scheduled");
  if (eventId) query = query.eq("google_event_id", eventId);
  if (patientPhone) query = query.eq("patient_phone", patientPhone);
  if (patientName) query = query.ilike("patient_name", `%${patientName}%`);
  if (datetime) {
    const target = parseLocalDateTime(datetime, ctx.clinic.timezone);
    query = query
      .gte("start_time", new Date(target.getTime() - 60 * 60_000).toISOString())
      .lte("start_time", new Date(target.getTime() + 60 * 60_000).toISOString());
  }

  const { data: matches, error } = await query.limit(5);
  if (error || !matches || matches.length === 0) {
    return "No encontré una cita agendada con esos datos.";
  }
  if (matches.length > 1) {
    return "Encontré más de una cita con esos datos. ¿Me puede confirmar la fecha exacta?";
  }

  const appointment = matches[0];
  if (appointment.google_event_id) {
    await deleteCalendarEvent(ctx.admin, ctx.clinic.id, appointment.google_event_id);
  }
  await ctx.admin.from("appointments").update({ status: "cancelled" }).eq("id", appointment.id);

  return `Listo, cancelé la cita de ${appointment.patient_name} del ${formatLocal(new Date(appointment.start_time), ctx.clinic.timezone)}.`;
}

function handleGetMenu(ctx: ToolHandlerContext): string {
  return JSON.stringify(ctx.config.menu_items ?? []);
}

async function handleCreateOrder(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  if (ctx.config.orders_paused) {
    return "En este momento no estamos tomando pedidos por teléfono, pero puedo responder cualquier consulta que tengas.";
  }
  if (!isWithinBusinessHours(ctx.config.business_hours, ctx.clinic.timezone)) {
    return "En este momento estamos cerrados y no podemos tomar pedidos, pero puedo responder tus consultas o contarte el horario de atención.";
  }

  const parsed = createOrderSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "Faltan datos para registrar el pedido. Necesito los productos con cantidad, tu nombre, teléfono y si es retiro o envío.";
  }
  const data = parsed.data;
  if (data.orderType === "delivery" && ctx.config.pickup_only) {
    return "Por el momento solo estamos aceptando pedidos para retirar en el local, no estamos haciendo envíos a domicilio. ¿Querés pedirlo para retirar?";
  }
  if (data.orderType === "delivery" && !data.deliveryAddress?.trim()) {
    return "Para un envío a domicilio necesito la dirección de entrega.";
  }

  const menu = ctx.config.menu_items ?? [];
  const notFound: string[] = [];
  const resolvedItems = data.items.map((item) => {
    const match = menu.find((menuItem) => menuItem.name.toLowerCase() === item.name.toLowerCase());
    if (!match) notFound.push(item.name);
    return {
      name: match?.name ?? item.name,
      quantity: item.quantity,
      unitPrice: match?.price ?? 0,
      notes: item.notes,
    };
  });

  if (notFound.length > 0) {
    return `No encontré en la carta: ${notFound.join(", ")}. ¿Podés confirmar el nombre exacto del producto?`;
  }

  const total = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const { data: order, error } = await ctx.admin
    .from("orders")
    .insert({
      clinic_id: ctx.clinic.id,
      call_id: ctx.callRowId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      order_type: data.orderType,
      delivery_address: data.orderType === "delivery" ? data.deliveryAddress ?? null : null,
      items: resolvedItems,
      total,
      notes: data.notes ?? null,
    })
    .select("id, order_number")
    .single();

  if (error || !order) {
    console.error("Error al guardar el pedido:", error);
    return "No pude registrar el pedido, intentemos de nuevo en un momento.";
  }

  return JSON.stringify({ ordered: true, orderId: order.id, orderNumber: order.order_number, total });
}

async function handleReserveTable(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = reserveTableSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "Faltan datos para la reserva. Necesito nombre, teléfono, cantidad de personas y la fecha/hora.";
  }
  const data = parsed.data;
  const reservationTime = assumeFutureIntent(parseLocalDateTime(data.reservationTime, ctx.clinic.timezone), new Date());

  const { data: reservation, error } = await ctx.admin
    .from("table_reservations")
    .insert({
      clinic_id: ctx.clinic.id,
      call_id: ctx.callRowId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      party_size: data.partySize,
      reservation_time: reservationTime.toISOString(),
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !reservation) {
    console.error("Error al guardar la reserva de mesa:", error);
    return "No pude registrar la reserva, intentemos de nuevo en un momento.";
  }

  return JSON.stringify({ reserved: true, local: formatLocal(reservationTime, ctx.clinic.timezone) });
}

async function handleGetProperties(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = getPropertiesSchema.safeParse(rawArgs);
  const maxPrice = parsed.success ? parsed.data.maxPrice : undefined;

  let query = ctx.admin
    .from("properties")
    .select("id, title, address, price, description")
    .eq("clinic_id", ctx.clinic.id)
    .eq("status", "disponible")
    .order("price", { ascending: true })
    .limit(15);
  if (maxPrice) query = query.lte("price", maxPrice);

  const { data } = await query;
  return JSON.stringify(data ?? []);
}

async function handleScheduleVisit(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = scheduleVisitSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "Faltan datos para agendar la visita. Necesito la propiedad, fecha/hora, nombre y teléfono.";
  }
  const data = parsed.data;

  const { data: property } = await ctx.admin
    .from("properties")
    .select("id")
    .eq("id", data.propertyId)
    .eq("clinic_id", ctx.clinic.id)
    .maybeSingle();
  if (!property) {
    return "No encontré esa propiedad. ¿Podés confirmar cuál te interesa? Puedo volver a consultar el listado.";
  }

  const visitTime = assumeFutureIntent(parseLocalDateTime(data.visitTime, ctx.clinic.timezone), new Date());

  const { data: visit, error } = await ctx.admin
    .from("property_visits")
    .insert({
      clinic_id: ctx.clinic.id,
      property_id: data.propertyId,
      call_id: ctx.callRowId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      visit_time: visitTime.toISOString(),
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !visit) {
    console.error("Error al guardar la visita:", error);
    return "No pude registrar la visita, intentemos de nuevo en un momento.";
  }

  return JSON.stringify({ scheduled: true, local: formatLocal(visitTime, ctx.clinic.timezone) });
}

async function handleLogInquiry(ctx: ToolHandlerContext, rawArgs: unknown): Promise<string> {
  const parsed = logInquirySchema.safeParse(rawArgs);
  if (!parsed.success) {
    return "Necesito al menos el teléfono del cliente y un resumen de qué necesita para anotarlo.";
  }
  const data = parsed.data;

  const { error } = await ctx.admin.from("inquiries").insert({
    clinic_id: ctx.clinic.id,
    call_id: ctx.callRowId,
    customer_name: data.customerName ?? null,
    customer_phone: data.customerPhone,
    reason: data.reason,
  });

  if (error) {
    console.error("Error al guardar la consulta:", error);
    return "No pude anotar la consulta, pero seguí adelante igual.";
  }

  return "Consulta anotada.";
}

function handleGetClinicInfo(ctx: ToolHandlerContext): string {
  const info = ctx.config.clinic_info;
  return JSON.stringify({
    name: ctx.clinic.name,
    address: ctx.clinic.address || null,
    phone: ctx.clinic.phone || null,
    paymentMethods: info.paymentMethods ?? [],
    policies: info.policies ?? null,
    faq: info.faq ?? [],
    services: ctx.config.services,
    businessHours: ctx.config.business_hours,
  });
}

function handleRequestHumanHandoff(ctx: ToolHandlerContext, rawArgs: unknown): string {
  const parsed = requestHumanHandoffSchema.safeParse(rawArgs);
  const reason = parsed.success ? parsed.data.reason : undefined;
  console.info(`[handoff] clinic=${ctx.clinic.id} call=${ctx.callRowId ?? "?"} reason=${reason ?? "sin especificar"}`);
  return ctx.config.handoff_message?.trim() || "Entiendo, permítame conectarlo con alguien del equipo de la clínica.";
}

export async function dispatchToolCall(ctx: ToolHandlerContext, name: string, rawArgs: unknown): Promise<string> {
  switch (name) {
    case TOOL_NAMES.checkAvailability:
      return handleCheckAvailability(ctx, rawArgs);
    case TOOL_NAMES.bookAppointment:
      return handleBookAppointment(ctx, rawArgs);
    case TOOL_NAMES.cancelAppointment:
      return handleCancelAppointment(ctx, rawArgs);
    case TOOL_NAMES.getClinicInfo:
      return handleGetClinicInfo(ctx);
    case TOOL_NAMES.requestHumanHandoff:
      return handleRequestHumanHandoff(ctx, rawArgs);
    case TOOL_NAMES.getMenu:
      return handleGetMenu(ctx);
    case TOOL_NAMES.createOrder:
      return handleCreateOrder(ctx, rawArgs);
    case TOOL_NAMES.reserveTable:
      return handleReserveTable(ctx, rawArgs);
    case TOOL_NAMES.getProperties:
      return handleGetProperties(ctx, rawArgs);
    case TOOL_NAMES.scheduleVisit:
      return handleScheduleVisit(ctx, rawArgs);
    case TOOL_NAMES.logInquiry:
      return handleLogInquiry(ctx, rawArgs);
    default:
      return `Tool no reconocida: ${name}`;
  }
}
