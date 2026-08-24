import type { SupabaseClient } from "@supabase/supabase-js";

import { buildFirstMessage } from "@/lib/vapi/promptBuilder";
import type { AgentConfig, Clinic, Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

/** Últimos N dígitos usados para matchear un teléfono sin importar si trae +54, 0, espacios, etc. */
const PHONE_SUFFIX_LENGTH = 8;

function phoneSuffix(phone: string): string {
  return phone.replace(/\D/g, "").slice(-PHONE_SUFFIX_LENGTH);
}

async function findReturningCustomerName(admin: AdminClient, clinic: Clinic, suffix: string): Promise<string | null> {
  if (clinic.business_type === "pedidos") {
    const { data } = await admin
      .from("orders")
      .select("customer_name, customer_phone")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const match = (data ?? []).find((row) => phoneSuffix(row.customer_phone) === suffix);
    return match?.customer_name ?? null;
  }

  const { data } = await admin
    .from("appointments")
    .select("patient_name, patient_phone")
    .eq("clinic_id", clinic.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const match = (data ?? []).find((row) => phoneSuffix(row.patient_phone) === suffix);
  return match?.patient_name ?? null;
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

    return clinic.business_type === "pedidos"
      ? `¡Hola ${firstName}! Qué bueno tenerte de vuelta en ${clinic.name}. ¿Qué te gustaría pedir hoy?`
      : `¡Hola ${firstName}! Qué bueno tenerte de vuelta en ${clinic.name}. ¿En qué te puedo ayudar hoy?`;
  } catch (err) {
    console.error("Error buscando cliente recurrente:", err);
    return fallback;
  }
}
