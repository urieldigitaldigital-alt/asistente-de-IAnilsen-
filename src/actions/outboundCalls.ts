"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { launchOutboundCallCampaign } from "@/lib/vapi/calls";
import { friendlyVapiError } from "@/lib/vapi/friendlyError";

const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
// Encuentra un número "suelto" en la línea aunque tenga espacios o guiones
// adentro (ej. "+54 9 2254 597287") — se normaliza después sacando esos
// separadores, no exige que el usuario lo escriba ya en formato E.164 puro.
const PHONE_TOKEN_REGEX = /\+\d[\d\s-]{4,20}\d/;
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

// Cada línea puede tener el nombre en cualquier lado, con o sin coma: "+5491122334455",
// "Nombre, +5491122334455", "+5491122334455 Nombre" — se acepta lo que sobre de la línea
// después de sacar el número como nombre.
function parseLeadsInput(raw: string): { leads: ParsedLead[]; invalidLines: string[] } {
  const leads: ParsedLead[] = [];
  const invalidLines: string[] = [];
  const seenPhones = new Set<string>();

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(PHONE_TOKEN_REGEX);
    const phone = match ? match[0].replace(/[\s-]/g, "") : null;
    if (!phone || !E164_PHONE_REGEX.test(phone)) {
      invalidLines.push(line);
      continue;
    }
    if (seenPhones.has(phone)) continue;
    seenPhones.add(phone);

    const name = line.replace(match![0], "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
    leads.push({ name, phone });
  }

  return { leads, invalidLines };
}

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
