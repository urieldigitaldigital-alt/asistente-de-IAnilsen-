import type { Vapi } from "@vapi-ai/server-sdk";

import { createClient } from "@/lib/supabase/server";
import { getTenantVapiClient } from "@/lib/vapi/credentials";
import { buildFirstMessage, buildSystemPrompt, type ReturningCustomerOrderDetails } from "@/lib/vapi/promptBuilder";
import { buildAssistantTools } from "@/lib/vapi/tools";
import type { AgentConfig, Clinic } from "@/types/database";

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL no está configurada.");
  return url.replace(/\/$/, "");
}

/**
 * Server que recibe el evento `assistant-request` en cada llamada entrante
 * (en vez de un `assistantId` fijo), para poder devolver un saludo
 * personalizado por número que llama. Ver /api/vapi/webhook.
 */
function buildNumberServer(): Vapi.Server {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) throw new Error("VAPI_WEBHOOK_SECRET no está configurada.");
  return { url: `${getAppUrl()}/api/vapi/webhook`, headers: { "x-webhook-secret": secret } };
}

function buildVoice(voice: { provider: string; voiceId: string; speed?: number; model?: string }): Vapi.CreateAssistantDtoVoice {
  const provider = voice.provider || process.env.VAPI_DEFAULT_VOICE_PROVIDER || "azure";
  const voiceId = voice.voiceId || process.env.VAPI_DEFAULT_VOICE_ID || "es-MX-DaliaNeural";
  // Un poco más rápido que el 1.0 nativo de Azure por defecto: se siente más
  // natural para una llamada telefónica que el ritmo "de lectura" estándar.
  const speed = voice.speed ?? 1.15;

  if (provider === "azure") {
    return { provider: "azure", voiceId: voiceId as Vapi.AzureVoiceId, speed };
  }
  if (provider === "11labs") {
    return {
      provider: "11labs",
      // Los IDs de voz vienen del campo de texto libre "Voice ID de
      // ElevenLabs" — recortamos espacios accidentales al copiar/pegar.
      voiceId: voiceId.trim() as Vapi.ElevenLabsVoiceId,
      // turbo_v2_5 es el único modelo que soporta forzar el idioma (español),
      // evitando que ElevenLabs detecte mal el idioma en frases cortas.
      model: (voice.model as Vapi.ElevenLabsVoiceModel) || "eleven_turbo_v2_5",
      language: "es",
      // ElevenLabs solo acepta 0.7x-1.2x; VAPI rechaza (400) cualquier valor
      // fuera de rango heredado del selector de Azure (hasta 1.5x).
      speed: Math.min(1.2, Math.max(0.7, speed)),
      stability: 0.5,
      similarityBoost: 0.75,
    };
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

/**
 * Compone el payload completo de un assistant de VAPI a partir de
 * clinic/agent_configs. Se usa tanto para publicar el assistant persistido
 * (botón "Publicar") como, con un saludo distinto, en la respuesta al evento
 * `assistant-request` (saludo personalizado por llamada).
 */
export function buildAssistantPayload(
  clinic: Clinic,
  config: AgentConfig,
  greeting: string,
  returningCustomer?: ReturningCustomerOrderDetails | null
) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) throw new Error("VAPI_WEBHOOK_SECRET no está configurada.");

  const systemPrompt = buildSystemPrompt(clinic, config, { returningCustomer, channel: "voice" });
  const tools = buildAssistantTools({ receptionPhoneNumber: clinic.phone || undefined, businessType: clinic.business_type });

  return {
    name: clinic.name.slice(0, 40),
    firstMessage: greeting,
    model: buildModel(config.model, tools, systemPrompt),
    voice: buildVoice(config.voice),
    transcriber: buildTranscriber(config.language),
    server: {
      url: `${getAppUrl()}/api/vapi/webhook`,
      headers: { "x-webhook-secret": secret },
    },
    serverMessages: ["tool-calls", "end-of-call-report", "status-update", "transcript"] as Vapi.CreateAssistantDtoServerMessagesItem[],
    // Red de seguridad además de la tool endCall: si el asistente dice
    // cualquiera de estas frases de despedida, VAPI cuelga automáticamente
    // aunque el modelo no llegue a invocar la tool.
    endCallPhrases: [
      "que tengas un excelente día",
      "que tengas un gran día",
      "hasta luego",
      "hasta pronto",
      "que tengas buen día",
    ],
    // Por defecto VAPI corta al asistente con solo 0.2s de cualquier sonido
    // de voz (ni una palabra completa) — eso lo interrumpía con ruido de
    // fondo o pausas del cliente. Exigimos al menos 2 palabras reales antes
    // de considerarlo una interrupción genuina.
    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.3,
      backoffSeconds: 1,
    },
  };
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

  const greeting = buildFirstMessage(config, clinic);
  const payload = buildAssistantPayload(clinic, config, greeting);

  const vapi = await getTenantVapiClient(clinic.id, supabase);

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

  // Resguardo: si el número vinculado quedó con un assistantId fijo (de una
  // versión vieja de este código, o un cambio manual en el dashboard de
  // VAPI), lo limpiamos acá. Sin esto, `assistant-request` nunca se dispara
  // y las llamadas usan el prompt/hora/menú congelados desde la última
  // publicación en vez de armarse frescos en cada llamada.
  if (config.vapi_phone_number_id) {
    try {
      const phoneNumber = await vapi.phoneNumbers.get({ id: config.vapi_phone_number_id });
      if (phoneNumber.assistantId) {
        await vapi.phoneNumbers.update({
          id: config.vapi_phone_number_id,
          body: { provider: phoneNumber.provider, assistantId: null } as unknown as Vapi.UpdatePhoneNumbersRequestBody,
        });
      }
    } catch (err) {
      console.error("No se pudo verificar/limpiar el assistantId fijo del número vinculado:", err);
    }
  }

  return { assistantId, created };
}

export interface ProvisionedPhoneNumber {
  phoneNumberId: string;
  number: string | null;
}

/**
 * Obtiene automáticamente un número de teléfono propio de VAPI (provider
 * "vapi") y lo vincula al assistant del negocio — sin que el dueño tenga que
 * entrar al dashboard de VAPI ni copiar ningún UUID a mano.
 */
export async function provisionVapiNumber(): Promise<ProvisionedPhoneNumber> {
  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("*").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("clinic_id, vapi_assistant_id")
    .eq("clinic_id", clinic.id)
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");
  if (!config.vapi_assistant_id) {
    throw new Error("Publica el asistente antes de obtener un número.");
  }

  const vapi = await getTenantVapiClient(clinic.id, supabase);
  const phoneNumber = await vapi.phoneNumbers.create({
    provider: "vapi",
    name: clinic.name.slice(0, 40),
    // Sin assistantId: dejamos que VAPI nos pida el asistente en cada
    // llamada (assistant-request) para poder personalizar el saludo.
    server: buildNumberServer(),
    // VAPI exige indicar un código de área de EE.UU. para asignar el número
    // (no vende números por país destino, sino por área dentro de EE.UU.).
    numberDesiredAreaCode: process.env.VAPI_DEFAULT_AREA_CODE || "305",
  });

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ vapi_phone_number_id: phoneNumber.id })
    .eq("clinic_id", clinic.id);
  if (updateError) throw updateError;

  return { phoneNumberId: phoneNumber.id, number: phoneNumber.number ?? null };
}

export interface TwilioImportParams {
  number: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
}

/**
 * Importa un número ya comprado en Twilio y lo vincula al assistant, todo en
 * un solo paso por API — el dueño no necesita tocar el dashboard de VAPI.
 * El Auth Token de Twilio se reenvía a VAPI (que lo necesita para operar el
 * número) y nunca se guarda en nuestra base de datos.
 */
export async function importTwilioNumber(params: TwilioImportParams): Promise<ProvisionedPhoneNumber> {
  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("*").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { data: config, error: configError } = await supabase
    .from("agent_configs")
    .select("clinic_id, vapi_assistant_id")
    .eq("clinic_id", clinic.id)
    .single();
  if (configError || !config) throw new Error("No se encontró la configuración del agente.");
  if (!config.vapi_assistant_id) {
    throw new Error("Publica el asistente antes de importar un número.");
  }

  const vapi = await getTenantVapiClient(clinic.id, supabase);
  const phoneNumber = await vapi.phoneNumbers.create({
    provider: "twilio",
    number: params.number,
    twilioAccountSid: params.twilioAccountSid,
    twilioAuthToken: params.twilioAuthToken,
    name: clinic.name.slice(0, 40),
    // Sin assistantId: dejamos que VAPI nos pida el asistente en cada
    // llamada (assistant-request) para poder personalizar el saludo.
    server: buildNumberServer(),
  });

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ vapi_phone_number_id: phoneNumber.id })
    .eq("clinic_id", clinic.id);
  if (updateError) throw updateError;

  return { phoneNumberId: phoneNumber.id, number: "number" in phoneNumber ? (phoneNumber.number ?? null) : null };
}

/** Vincula un número de VAPI (ya creado por el dueño en el dashboard, ej. un número propio importado) al assistant publicado de la clínica. */
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

  const vapi = await getTenantVapiClient(config.clinic_id, supabase);
  const phoneNumber = await vapi.phoneNumbers.get({ id: phoneNumberId });

  await vapi.phoneNumbers.update({
    id: phoneNumberId,
    // assistantId: null (no solo omitido) para borrar un valor ya fijado —
    // VAPI trata los campos ausentes en el PATCH como "sin cambios", no como
    // "vaciar". Sin esto, assistant-request nunca llega a dispararse.
    body: { provider: phoneNumber.provider, assistantId: null, server: buildNumberServer() } as unknown as Vapi.UpdatePhoneNumbersRequestBody,
  });

  const { error: updateError } = await supabase
    .from("agent_configs")
    .update({ vapi_phone_number_id: phoneNumberId })
    .eq("clinic_id", config.clinic_id);
  if (updateError) throw updateError;
}

/** Trae los dígitos del número (para mostrarlo en Integraciones) — puede ser null mientras se está activando. */
export async function getPhoneNumberDigits(
  clinicId: string,
  phoneNumberId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  try {
    const vapi = await getTenantVapiClient(clinicId, supabase);
    const phoneNumber = await vapi.phoneNumbers.get({ id: phoneNumberId });
    return "number" in phoneNumber ? (phoneNumber.number ?? null) : null;
  } catch (err) {
    console.error("No se pudo leer el número de VAPI:", err);
    return null;
  }
}
