"use server";

import { createClient } from "@/lib/supabase/server";
import { launchOutboundCallCampaign } from "@/lib/vapi/calls";
import { friendlyVapiError } from "@/lib/vapi/friendlyError";

const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
// Acepta el número con espacios o guiones adentro (ej. "+54 9 2254 597287")
// y lo normaliza sacando esos separadores, en vez de exigir E.164 puro.
const PHONE_TOKEN_REGEX = /\+\d[\d\s-]{4,20}\d/;

export interface OutboundCallEntry {
  name: string;
  phone: string;
  ok: boolean;
  error: string | null;
}

export interface AddOutboundCallState {
  history: OutboundCallEntry[];
  formError: string | null;
}

/**
 * Agrega un contacto y lo llama al instante (uno por vez, no en tanda) desde
 * el panel de CRM — leads/clientes propios del negocio, nunca extraídos de
 * una fuente externa por nosotros. Usa el asistente ya publicado, solo
 * personaliza el saludo por nombre.
 */
export async function addOutboundCallAction(
  prevState: AddOutboundCallState,
  formData: FormData
): Promise<AddOutboundCallState> {
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  const match = rawPhone.match(PHONE_TOKEN_REGEX);
  const phone = match ? match[0].replace(/[\s-]/g, "") : null;
  if (!phone || !E164_PHONE_REGEX.test(phone)) {
    return {
      history: prevState.history,
      formError: "Ese número no parece válido. Usá formato internacional, ej: +5491122334455.",
    };
  }

  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id, name").single();
  if (!clinic) return { history: prevState.history, formError: "No se encontró el negocio." };

  const { data: config } = await supabase
    .from("agent_configs")
    .select("vapi_phone_number_id, vapi_assistant_id")
    .single();
  if (!config?.vapi_phone_number_id || !config?.vapi_assistant_id) {
    return {
      history: prevState.history,
      formError: "Todavía no tenés un asistente y número publicados en VAPI. Andá a Integraciones.",
    };
  }

  try {
    await launchOutboundCallCampaign(supabase, {
      clinicId: clinic.id,
      clinicName: clinic.name,
      vapiPhoneNumberId: config.vapi_phone_number_id,
      vapiAssistantId: config.vapi_assistant_id,
      leads: [{ name, phone }],
    });
    return { history: [...prevState.history, { name, phone, ok: true, error: null }], formError: null };
  } catch (err) {
    const error = friendlyVapiError(err, "No se pudo iniciar la llamada.");
    return { history: [...prevState.history, { name, phone, ok: false, error }], formError: null };
  }
}
