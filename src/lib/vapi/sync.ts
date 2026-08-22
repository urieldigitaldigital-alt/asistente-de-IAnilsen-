import type { Vapi } from "@vapi-ai/server-sdk";

import { createClient } from "@/lib/supabase/server";
import { getVapiClient } from "@/lib/vapi/client";
import { buildFirstMessage, buildSystemPrompt } from "@/lib/vapi/promptBuilder";
import { buildAssistantTools } from "@/lib/vapi/tools";

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL no está configurada.");
  return url.replace(/\/$/, "");
}

function buildVoice(voice: { provider: string; voiceId: string }): Vapi.CreateAssistantDtoVoice {
  const provider = voice.provider || process.env.VAPI_DEFAULT_VOICE_PROVIDER || "azure";
  const voiceId = voice.voiceId || process.env.VAPI_DEFAULT_VOICE_ID || "es-MX-DaliaNeural";

  if (provider === "azure") {
    return { provider: "azure", voiceId: voiceId as Vapi.AzureVoiceId };
  }
  // Fallback razonable: voz propia de Vapi si se configuró un provider no soportado aún.
  return { provider: "vapi", voiceId: voiceId as Vapi.VapiVoiceVoiceId };
}

function buildTranscriber(language: string): Vapi.CreateAssistantDtoTranscriber {
  const deepgramLanguage = (process.env.VAPI_DEFAULT_TRANSCRIBER_LANGUAGE || language || "es") as Vapi.DeepgramTranscriberLanguage;
  return {
    provider: "deepgram",
    model: (process.env.VAPI_DEFAULT_TRANSCRIBER_MODEL as Vapi.DeepgramTranscriberModel) || "nova-3",
    language: deepgramLanguage,
  };
}

function buildModel(
  modelConfig: { provider: string; model: string },
  tools: Vapi.OpenAiModelToolsItem[],
  systemPrompt: string
): Vapi.CreateAssistantDtoModel {
  const provider = modelConfig.provider || process.env.VAPI_DEFAULT_MODEL_PROVIDER || "openai";
  const model = modelConfig.model || process.env.VAPI_DEFAULT_MODEL || "gpt-4.1";

  // Solo openai está soportado como configuración por defecto; otros providers
  // requerirían mapear campos específicos que no forman parte de este alcance.
  return {
    provider: "openai",
    model: (provider === "openai" ? model : "gpt-4.1") as Vapi.OpenAiModelModel,
    messages: [{ role: "system", content: systemPrompt }],
    tools,
  };
}

export interface SyncAssistantResult {
  assistantId: string;
  created: boolean;
}

/** Compone la configuración completa del asistente a partir de agent_configs y la crea/actualiza en VAPI. */
export async function syncAssistant(): Promise<SyncAssistantResult> {
  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("*").single();
  if (clinicError || !clinic) throw new Error("No se encontró la clínica del usuario.");

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("clinic_id", clinic.id)
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");

  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) throw new Error("VAPI_WEBHOOK_SECRET no está configurada.");

  const systemPrompt = buildSystemPrompt(clinic, config);
  const firstMessage = buildFirstMessage(config, clinic);
  const tools = buildAssistantTools({ receptionPhoneNumber: clinic.phone || undefined });

  const vapi = getVapiClient();
  const payload = {
    name: clinic.name.slice(0, 40),
    firstMessage,
    model: buildModel(config.model, tools, systemPrompt),
    voice: buildVoice(config.voice),
    transcriber: buildTranscriber(config.language),
    server: {
      url: `${getAppUrl()}/api/vapi/webhook`,
      headers: { "x-webhook-secret": secret },
    },
    serverMessages: ["tool-calls", "end-of-call-report", "status-update", "transcript"] as Vapi.CreateAssistantDtoServerMessagesItem[],
  };

  let assistantId = config.vapi_assistant_id;
  let created = false;

  if (assistantId) {
    await vapi.assistants.update({ id: assistantId, ...payload });
  } else {
    const assistant = await vapi.assistants.create(payload);
    assistantId = assistant.id;
    created = true;
  }

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ vapi_assistant_id: assistantId })
    .eq("clinic_id", clinic.id);
  if (updateError) throw updateError;

  return { assistantId, created };
}

/** Vincula un número de VAPI (ya creado por el dueño en el dashboard) al assistant publicado de la clínica. */
export async function linkPhoneNumber(phoneNumberId: string): Promise<void> {
  const supabase = await createClient();

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("clinic_id, vapi_assistant_id")
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");
  if (!config.vapi_assistant_id) {
    throw new Error("Publica el asistente antes de vincular un número.");
  }

  const vapi = getVapiClient();
  const phoneNumber = await vapi.phoneNumbers.get({ id: phoneNumberId });

  await vapi.phoneNumbers.update({
    id: phoneNumberId,
    body: { provider: phoneNumber.provider, assistantId: config.vapi_assistant_id } as Vapi.UpdatePhoneNumbersRequestBody,
  });

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ vapi_phone_number_id: phoneNumberId })
    .eq("clinic_id", config.clinic_id);
  if (updateError) throw updateError;
}
