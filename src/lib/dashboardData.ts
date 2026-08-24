import type { SupabaseClient } from "@supabase/supabase-js";

import type { BusinessType, Database } from "@/types/database";

export interface DashboardChartPoint {
  day: string;
  calls: number;
  appointments: number;
}

export interface DashboardRecentCall {
  id: string;
  when: string | null;
  phoneNumber: string | null;
  status: string | null;
  summary: string | null;
}

export interface DashboardData {
  businessType: BusinessType;
  callsToday: number;
  callsWeek: number;
  appointmentsScheduled: number;
  avgDurationMinutes: number | null;
  bookingRatePct: number | null;
  chart: DashboardChartPoint[];
  recentCalls: DashboardRecentCall[];
  googleConnected: boolean;
  vapiAssistantId: string | null;
  vapiPhoneNumberId: string | null;
  whatsappMessagesToday: number;
  whatsappConversationsActive: number;
  whatsappNeedsFollowUp: number;
  ordersToday: number;
  ordersInPreparation: number;
  ordersReady: number;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardData(supabase: SupabaseClient<Database>): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60_000));

  const [
    callsTodayRes,
    callsWeekRes,
    appointmentsScheduledRes,
    weekCallsRes,
    weekAppointmentsRes,
    recentCallsRes,
    configRes,
    googleRes,
    whatsappMessagesTodayRes,
    whatsappActiveRes,
    whatsappFollowUpRes,
    clinicRes,
    ordersTodayRes,
    ordersInPreparationRes,
    ordersReadyRes,
  ] = await Promise.all([
    supabase.from("calls").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("calls").select("id", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("calls").select("created_at, started_at, ended_at").gte("created_at", weekStart.toISOString()),
    supabase
      .from("appointments")
      .select("created_at")
      .gte("created_at", weekStart.toISOString())
      .eq("status", "scheduled"),
    supabase
      .from("calls")
      .select("id, started_at, created_at, phone_number, status, summary")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("agent_configs").select("vapi_assistant_id, vapi_phone_number_id").single(),
    supabase.from("google_credentials").select("clinic_id").maybeSingle(),
    supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("whatsapp_sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("whatsapp_sessions").select("id", { count: "exact", head: true }).eq("status", "needs_follow_up"),
    supabase.from("clinics").select("business_type").single(),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "en_preparacion"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "listo"),
  ]);

  const weekCalls = weekCallsRes.data ?? [];
  const weekAppointments = weekAppointmentsRes.data ?? [];

  const durations = weekCalls
    .filter((call) => call.started_at && call.ended_at)
    .map((call) => (new Date(call.ended_at as string).getTime() - new Date(call.started_at as string).getTime()) / 60_000)
    .filter((minutes) => minutes > 0 && minutes < 120);
  const avgDurationMinutes = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const callsWeekCount = callsWeekRes.count ?? 0;
  const bookingRatePct = callsWeekCount > 0 ? Math.round((weekAppointments.length / callsWeekCount) * 100) : null;

  const buckets = new Map<string, { calls: number; appointments: number }>();
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart.getTime() + i * 24 * 60 * 60_000);
    buckets.set(dayKey(day), { calls: 0, appointments: 0 });
  }
  for (const call of weekCalls) {
    const key = dayKey(new Date(call.created_at));
    const bucket = buckets.get(key);
    if (bucket) bucket.calls += 1;
  }
  for (const appointment of weekAppointments) {
    const key = dayKey(new Date(appointment.created_at));
    const bucket = buckets.get(key);
    if (bucket) bucket.appointments += 1;
  }

  const chart: DashboardChartPoint[] = Array.from(buckets.entries()).map(([key, value]) => ({
    day: new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(new Date(`${key}T12:00:00Z`)),
    ...value,
  }));

  const recentCalls: DashboardRecentCall[] = (recentCallsRes.data ?? []).map((call) => ({
    id: call.id,
    when: call.started_at ?? call.created_at,
    phoneNumber: call.phone_number,
    status: call.status,
    summary: call.summary,
  }));

  return {
    businessType: clinicRes.data?.business_type ?? "citas",
    callsToday: callsTodayRes.count ?? 0,
    callsWeek: callsWeekCount,
    appointmentsScheduled: appointmentsScheduledRes.count ?? 0,
    avgDurationMinutes,
    bookingRatePct,
    chart,
    recentCalls,
    googleConnected: Boolean(googleRes.data),
    vapiAssistantId: configRes.data?.vapi_assistant_id ?? null,
    vapiPhoneNumberId: configRes.data?.vapi_phone_number_id ?? null,
    whatsappMessagesToday: whatsappMessagesTodayRes.count ?? 0,
    whatsappConversationsActive: whatsappActiveRes.count ?? 0,
    whatsappNeedsFollowUp: whatsappFollowUpRes.count ?? 0,
    ordersToday: ordersTodayRes.count ?? 0,
    ordersInPreparation: ordersInPreparationRes.count ?? 0,
    ordersReady: ordersReadyRes.count ?? 0,
  };
}
