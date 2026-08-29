import type { SupabaseClient } from "@supabase/supabase-js";

import { buildFirstMessage, type ReturningCustomerOrderDetails } from "@/lib/vapi/promptBuilder";
import type { AgentConfig, Clinic, Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

/** Últimos N dígitos usados para matchear un teléfono sin importar si trae +54, 0, espacios, etc. */
const PHONE_SUFFIX_LENGTH = 8;

function phoneSuffix(phone: string): string {
  return phone.replace(/\D/g, "").slice(-PHONE_SUFFIX_LENGTH);
}

async function findReturningCustomerName(admin: AdminClient, clinic: Clinic, suffix: string): Promise<string | null> {
  switch (clinic.business_type) {
    case "pedidos":
    case "restaurante": {
      const { data } = await admin
        .from("orders")
        .select("customer_name, customer_phone")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []).find((row) => phoneSuffix(row.customer_phone) === suffix)?.customer_name ?? null;
    }
    case "inmobiliaria": {
      const { data } = await admin
        .from("property_visits")
        .select("customer_name, customer_phone")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []).find((row) => phoneSuffix(row.customer_phone) === suffix)?.customer_name ?? null;
    }
    case "llamadas": {
      const { data } = await admin
        .from("inquiries")
        .select("customer_name, customer_phone")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []).find((row) => phoneSuffix(row.customer_phone) === suffix)?.customer_name ?? null;
    }
    case "citas":
    default: {
      const { data } = await admin
        .from("appointments")
        .select("patient_name, patient_phone")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []).find((row) => phoneSuffix(row.patient_phone) === suffix)?.patient_name ?? null;
    }
  }
}

/**
 * Datos del último pedido de este cliente (nombre, forma de entrega,
 * dirección) — para que el asistente pueda ofrecer reusarlos en vez de
 * volver a pedirlos de cero. Solo aplica a pedidos/restaurante; no repite el
 * pedido en sí, solo los datos de contacto/entrega.
 */
export async function findReturningCustomerOrderDetails(
  admin: AdminClient,
  clinic: Clinic,
  customerNumber: string | undefined
): Promise<ReturningCustomerOrderDetails | null> {
  if (clinic.business_type !== "pedidos" && clinic.business_type !== "restaurante") return null;
  if (!customerNumber) return null;

  const suffix = phoneSuffix(customerNumber);
  if (suffix.length < 6) return null;

  try {
    const { data } = await admin
      .from("orders")
      .select("customer_name, customer_phone, order_type, delivery_address")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const lastOrder = (data ?? []).find((row) => phoneSuffix(row.customer_phone) === suffix);
    if (!lastOrder) return null;

    return {
      customerName: lastOrder.customer_name,
      lastOrderType: lastOrder.order_type,
      lastDeliveryAddress: lastOrder.delivery_address,
    };
  } catch (err) {
    console.error("Error buscando los datos del último pedido del cliente:", err);
    return null;
  }
}

/**
 * Saludo del primer mensaje de la llamada: si el número que llama coincide
 * con el de un pedido/cita anterior de este negocio, saluda por su nombre;
 * si no, usa el mensaje inicial normal.
 */
export async function buildPersonalizedFirstMessage(
  admin: AdminClient,
  clinic: Clinic,
  config: AgentConfig,
  customerNumber: string | undefined
): Promise<string> {
  const fallback = buildFirstMessage(config, clinic);
  if (!customerNumber) return fallback;

  const suffix = phoneSuffix(customerNumber);
  if (suffix.length < 6) return fallback;

  try {
    const fullName = await findReturningCustomerName(admin, clinic, suffix);
    const firstName = fullName?.trim().split(/\s+/)[0];
    if (!firstName) return fallback;

    const help =
      clinic.business_type === "pedidos" || clinic.business_type === "restaurante"
        ? "¿Qué te gustaría pedir hoy?"
        : "¿En qué te puedo ayudar hoy?";
    return `¡Hola ${firstName}! Gracias por volver a llamar a ${clinic.name}. ${help}`;
  } catch (err) {
    console.error("Error buscando cliente recurrente:", err);
    return fallback;
  }
}
