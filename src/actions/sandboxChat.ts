"use server";

import type { Vapi } from "@vapi-ai/server-sdk";

import { createClient } from "@/lib/supabase/server";
import { getTenantVapiClient } from "@/lib/vapi/credentials";
import { friendlyVapiError } from "@/lib/vapi/friendlyError";

export interface SandboxChatResult {
  reply: string;
  chatId: string | null;
  error: string | null;
}

/**
 * Sandbox de "Probar": manda un mensaje de texto contra el system prompt
 * actual (aún sin publicar) usando el chat de VAPI, sin tools ni voz.
 */
export async function sendSandboxMessageAction(
  systemPrompt: string,
  modelName: string,
  message: string,
  previousChatId: string | null
): Promise<SandboxChatResult> {
  if (!message.trim()) {
    return { reply: "", chatId: previousChatId, error: "Escribe un mensaje para probar." };
  }

  try {
    const supabase = await createClient();
    const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
    if (clinicError || !clinic) {
      return { reply: "", chatId: previousChatId, error: "No se encontró el negocio del usuario." };
    }

    const vapi = await getTenantVapiClient(clinic.id, supabase);
    const response = await vapi.chats.create({
      input: message,
      previousChatId: previousChatId ?? undefined,
      assistant: previousChatId
        ? undefined
        : {
            model: {
              provider: "openai",
              model: (modelName || "gpt-4.1") as Vapi.OpenAiModelModel,
              messages: [{ role: "system", content: systemPrompt }],
            },
          },
    });

    if (!("output" in response)) {
      return { reply: "", chatId: previousChatId, error: "El sandbox no soporta respuestas en streaming." };
    }

    const lastAssistantMessage = [...(response.output ?? [])].reverse().find((item) => item.role === "assistant");

    return {
      reply: (lastAssistantMessage && "content" in lastAssistantMessage && lastAssistantMessage.content) || "(sin respuesta)",
      chatId: response.id,
      error: null,
    };
  } catch (err) {
    console.error("Error en sandbox de chat de VAPI:", err);
    return { reply: "", chatId: previousChatId, error: friendlyVapiError(err, "Error al probar el prompt.") };
  }
}
