import type Retell from "retell-sdk";

import { createClient } from "@/lib/supabase/server";
import { getTenantRetellClient } from "@/lib/retell/credentials";
import { buildRetellTools } from "@/lib/retell/tools";
import { buildFirstMessage, buildSystemPrompt } from "@/lib/vapi/promptBuilder";
import type { AgentConfig, Clinic } from "@/types/database";

const DEFAULT_RETELL_VOICE_ID = "retell-Andrea";
// Retell no tiene acento argentino — "Mexican" es el más neutro/estándar
// para español latinoamericano (mismo criterio que ya usaba VAPI con
// es-MX-DaliaNeural de Azure).
const RETELL_LANGUAGE: Record<string, Retell.AgentCreateParams["language"]> = { es: "es-419", en: "en-US" };
const RETELL_MODELS = new Set([
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "claude-4.5-sonnet",
  "claude-4.6-sonnet",
  "claude-5-sonnet",
  "claude-4.5-haiku",
]);

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL no está configurada.");
  return url.replace(/\/$/, "");
}

function getToolCallUrl(): string {
  return `${getAppUrl()}/api/retell/tool-call`;
}

function getAgentWebhookUrl(): string {
  return `${getAppUrl()}/api/retell/webhook`;
}

function resolveModel(model: string | undefined): Retell.LlmCreateParams["model"] {
  return (model && RETELL_MODELS.has(model) ? model : "gpt-4.1") as Retell.LlmCreateParams["model"];
}

function resolveLanguage(language: string): NonNullable<Retell.AgentCreateParams["language"]> {
  return RETELL_LANGUAGE[language] ?? "es-419";
}

function resolveVoiceSpeed(speed: number | undefined): number {
  // Rango documentado de Retell: [0.5, 2].
  return Math.min(2, Math.max(0.5, speed ?? 1));
}

export interface SyncAgentResult {
  agentId: string;
  llmId: string;
  created: boolean;
}

/**
 * Compone el prompt/tools del LLM y crea o actualiza el LLM + Agent de
 * Retell del negocio a partir de agent_configs. El saludo (`begin_message`)
 * vive en el LLM, no en el Agent (confirmado contra el SDK de Retell).
 */
export async function syncAgent(): Promise<SyncAgentResult> {
  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("*").single();
  if (clinicError || !clinic) throw new Error("No se encontró la clínica del usuario.");

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("clinic_id", clinic.id)
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");

  const retell = await getTenantRetellClient(clinic.id, supabase);

  const greeting = buildFirstMessage(config, clinic);
  const systemPrompt = buildSystemPrompt(clinic, config);
  const tools = buildRetellTools({
    businessType: clinic.business_type,
    receptionPhoneNumber: clinic.phone || undefined,
    toolCallUrl: getToolCallUrl(),
  });

  const llmPayload = {
    general_prompt: systemPrompt,
    general_tools: tools,
    // "{{greeting}}" en vez del texto fijo: el webhook de "call_inbound" pisa
    // esta variable con el saludo personalizado (cliente recurrente) en cada
    // llamada — default_dynamic_variables es la red de seguridad si por
    // algún motivo ese webhook falla y Retell usa el agente directo.
    begin_message: "{{greeting}}",
    default_dynamic_variables: { greeting },
    model: resolveModel(config.model.model),
  };

  let llmId = config.retell_llm_id;
  if (llmId) {
    await retell.llm.update(llmId, llmPayload);
  } else {
    const llm = await retell.llm.create(llmPayload);
    llmId = llm.llm_id;
  }

  const agentPayload: Retell.AgentCreateParams = {
    response_engine: { type: "retell-llm", llm_id: llmId },
    voice_id: config.voice.voiceId || DEFAULT_RETELL_VOICE_ID,
    voice_speed: resolveVoiceSpeed(config.voice.speed),
    language: resolveLanguage(config.language),
    agent_name: clinic.name.slice(0, 40),
    webhook_url: getAgentWebhookUrl(),
  };

  let agentId = config.retell_agent_id;
  let created = false;
  if (agentId) {
    await retell.agent.update(agentId, agentPayload);
  } else {
    const agent = await retell.agent.create(agentPayload);
    agentId = agent.agent_id;
    created = true;
  }

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ retell_agent_id: agentId, retell_llm_id: llmId })
    .eq("clinic_id", clinic.id);
  if (updateError) throw updateError;

  // Resguardo: si el número vinculado quedó con un agente fijo (de un cambio
  // manual en el dashboard de Retell), lo limpiamos acá. Sin esto,
  // "call_inbound" nunca se dispara y las llamadas usan el saludo/prompt
  // congelados desde la última publicación en vez de armarse frescos.
  if (config.retell_phone_number) {
    try {
      await retell.phoneNumber.update(config.retell_phone_number, { inbound_agents: null });
    } catch (err) {
      console.error("No se pudo verificar/limpiar el agente fijo del número vinculado:", err);
    }
  }

  return { agentId, llmId, created };
}

export interface ProvisionedPhoneNumber {
  phoneNumber: string;
}

/**
 * Obtiene automáticamente un número de teléfono propio de Retell (EE.UU.) y
 * lo vincula al agente del negocio — sin que el dueño tenga que entrar al
 * dashboard de Retell ni copiar nada a mano. Útil para pruebas: Retell (como
 * VAPI) no vende números de Argentina directamente.
 */
export async function provisionRetellNumber(): Promise<ProvisionedPhoneNumber> {
  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("*").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("clinic_id, retell_agent_id")
    .eq("clinic_id", clinic.id)
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");
  if (!config.retell_agent_id) {
    throw new Error("Publica el asistente antes de obtener un número.");
  }

  const retell = await getTenantRetellClient(clinic.id, supabase);
  const phoneNumber = await retell.phoneNumber.create({
    country_code: "US",
    nickname: clinic.name.slice(0, 40),
    // Sin inbound_agents: dejamos que Retell nos pida el agente en cada
    // llamada (call_inbound) para poder personalizar el saludo.
    inbound_webhook_url: getAgentWebhookUrl(),
  });

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ retell_phone_number: phoneNumber.phone_number })
    .eq("clinic_id", clinic.id);
  if (updateError) throw updateError;

  return { phoneNumber: phoneNumber.phone_number };
}

/** Vincula un número ya existente en Retell (creado en su dashboard, o vía SIP trunk) al agente publicado del negocio. */
export async function linkRetellPhoneNumber(phoneNumber: string): Promise<void> {
  const supabase = await createClient();

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("clinic_id, retell_agent_id")
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");
  if (!config.retell_agent_id) {
    throw new Error("Publica el asistente antes de vincular un número.");
  }

  const retell = await getTenantRetellClient(config.clinic_id, supabase);

  await retell.phoneNumber.update(phoneNumber, {
    // null (no solo omitido) para borrar un agente ya fijado — Retell trata
    // los campos ausentes en el PATCH como "sin cambios", no como "vaciar".
    inbound_agents: null,
    inbound_webhook_url: getAgentWebhookUrl(),
  });

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ retell_phone_number: phoneNumber })
    .eq("clinic_id", config.clinic_id);
  if (updateError) throw updateError;
}
