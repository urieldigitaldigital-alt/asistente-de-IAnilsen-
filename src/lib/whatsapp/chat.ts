import type { SupabaseClient } from "@supabase/supabase-js";
import type { Vapi, VapiClient } from "@vapi-ai/server-sdk";

import type { Database } from "@/types/database";

export interface WhatsappConversation {
  /** id de la fila en whatsapp_sessions (nuestra conversación) — usado para loguear mensajes. */
  id: string;
  /** id de la sesión en VAPI — usado para llamar a la Chat API. */
  vapiSessionId: string;
}

/**
 * Busca (o crea) la sesión de la Chat API de VAPI para esta conversación de
 * WhatsApp (negocio + número del cliente), para que el asistente recuerde el
 * contexto entre mensajes en vez de arrancar de cero cada vez.
 */
export async function getOrCreateWhatsappSession(params: {
  clinicId: string;
  customerPhone: string;
  assistantId: string;
  vapi: VapiClient;
  admin: SupabaseClient<Database>;
}): Promise<WhatsappConversation> {
  const { clinicId, customerPhone, assistantId, vapi, admin } = params;

  const { data: existing } = await admin
    .from("whatsapp_sessions")
    .select("id, vapi_session_id")
    .eq("clinic_id", clinicId)
    .eq("customer_phone", customerPhone)
    .maybeSingle();
  if (existing) return { id: existing.id, vapiSessionId: existing.vapi_session_id };

  const session = await vapi.sessions.create({
    assistantId,
    name: `whatsapp-${customerPhone}`.slice(0, 40),
  });

  const { data: created, error } = await admin
    .from("whatsapp_sessions")
    .upsert(
      { clinic_id: clinicId, customer_phone: customerPhone, vapi_session_id: session.id },
      { onConflict: "clinic_id,customer_phone" }
    )
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("No se pudo crear la conversación de WhatsApp.");

  return { id: created.id, vapiSessionId: session.id };
}

/** Extrae el último mensaje de texto del asistente de la respuesta de la Chat API. */
function extractAssistantText(output: Vapi.ChatOutputItem[] | undefined): string | null {
  if (!output) return null;
  for (let i = output.length - 1; i >= 0; i--) {
    const item = output[i];
    if (item.role === "assistant" && "content" in item && item.content) {
      return item.content;
    }
  }
  return null;
}

/**
 * Manda el mensaje entrante del cliente al assistant (vía Chat API) y
 * devuelve la respuesta en texto. Solo `sessionId` — VAPI rechaza (400) que
 * se mande junto con `assistantId`, ya que la sesión ya quedó vinculada al
 * assistant desde que se creó en `getOrCreateWhatsappSession`.
 */
export async function sendChatMessage(params: { vapi: VapiClient; sessionId: string; input: string }): Promise<string | null> {
  const { vapi, sessionId, input } = params;
  const chat = await vapi.chats.create({ sessionId, input });
  if ("output" in chat) {
    return extractAssistantText(chat.output);
  }
  return null;
}
