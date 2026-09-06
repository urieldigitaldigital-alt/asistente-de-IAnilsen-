"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { launchOutboundCallCampaign } from "@/lib/vapi/calls";
import { friendlyVapiError } from "@/lib/vapi/friendlyError";

const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
const MAX_LEADS_PER_BATCH = 200;

export interface LaunchOutboundCallsState {
  campaignId: string | null;
  leadsCalled: number;
  error: string | null;
}

interface ParsedLead {
  name: string;
  phone: string;
}

// Cada línea: "+5491122334455" o "Nombre, +5491122334455" (nombre opcional, en cualquier orden).
function parseLeadsInput(raw: string): { leads: ParsedLead[]; invalidLines: string[] } {
  const leads: ParsedLead[] = [];
  const invalidLines: string[] = [];
  const seenPhones = new Set<string>();

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    const phone = parts.find((p) => E164_PHONE_REGEX.test(p));
    if (!phone) {
      invalidLines.push(line);
      continue;
    }
    if (seenPhones.has(phone)) continue;
    seenPhones.add(phone);

    const name = parts.filter((p) => p !== phone).join(" ");
    leads.push({ name, phone });
  }

  return { leads, invalidLines };
}

export const initialOutboundCallsState: LaunchOutboundCallsState = { campaignId: null, leadsCalled: 0, error: null };

/**
 * Lanza una campaña de llamadas salientes de VAPI a una lista de números
 * pegados a mano en el panel (leads/clientes propios del negocio, nunca
 * extraídos de una fuente externa por nosotros). Usa el asistente ya
 * publicado del negocio, solo con un saludo inicial personalizado por nombre.
 */
export async function launchOutboundCallsAction(
  _prevState: LaunchOutboundCallsState,
  formData: FormData
): Promise<LaunchOutboundCallsState> {
  const raw = String(formData.get("numbers") ?? "");
  const { leads, invalidLines } = parseLeadsInput(raw);

  if (leads.length === 0) {
    return {
      campaignId: null,
      leadsCalled: 0,
      error:
        invalidLines.length > 0
          ? `Ningún número tiene formato válido (usá +código de país, ej. +5491122334455). Revisá: ${invalidLines.join(" | ")}`
          : "Pegá al menos un número de teléfono.",
    };
  }

  if (leads.length > MAX_LEADS_PER_BATCH) {
    return {
      campaignId: null,
      leadsCalled: 0,
      error: `Como máximo ${MAX_LEADS_PER_BATCH} números por tanda. Dividí la lista y volvé a intentar.`,
    };
  }

  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id, name").single();
  if (!clinic) return { campaignId: null, leadsCalled: 0, error: "No se encontró el negocio." };

  const { data: config } = await supabase
    .from("agent_configs")
    .select("vapi_phone_number_id, vapi_assistant_id")
    .single();
  if (!config?.vapi_phone_number_id || !config?.vapi_assistant_id) {
    return {
      campaignId: null,
      leadsCalled: 0,
      error: "Todavía no tenés un asistente y número publicados en VAPI. Andá a Integraciones.",
    };
  }

  try {
    const { campaignId } = await launchOutboundCallCampaign(supabase, {
      clinicId: clinic.id,
      clinicName: clinic.name,
      vapiPhoneNumberId: config.vapi_phone_number_id,
      vapiAssistantId: config.vapi_assistant_id,
      leads,
    });

    revalidatePath("/crm");
    return {
      campaignId,
      leadsCalled: leads.length,
      error: invalidLines.length > 0 ? `Se ignoraron líneas sin formato válido: ${invalidLines.join(" | ")}` : null,
    };
  } catch (err) {
    return { campaignId: null, leadsCalled: 0, error: friendlyVapiError(err, "No se pudo iniciar la campaña de llamadas.") };
  }
}
