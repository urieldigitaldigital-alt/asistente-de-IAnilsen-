"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { LeadInterestLevel, WhatsappConversationStatus } from "@/types/database";
import { getOwnWhatsappCredentials, saveWhatsappCredentials } from "@/lib/whatsapp/credentials";
import { logWhatsappMessage, updateConversationInterest, updateConversationStatus } from "@/lib/whatsapp/messages";
import { checkWhatsAppConnection, sendWhatsAppMessage } from "@/lib/whatsapp/meta";
import { whatsappCredentialsFormSchema, whatsappReplySchema } from "@/lib/validation";

export interface WhatsappActionState {
  error: string | null;
  success: string | null;
}

/**
 * Prueba de verdad la conexión de WhatsApp contra Meta y devuelve el
 * resultado en lenguaje de dueño de negocio — es lo que respalda el botón
 * "Probar ahora". No manda ningún mensaje: solo confirma que el número sigue
 * conectado y que el permiso no se venció.
 */
export async function testWhatsappConnectionAction(): Promise<WhatsappActionState> {
  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) return { error: "No se encontró el negocio del usuario.", success: null };

  const credentials = await getOwnWhatsappCredentials(clinic.id, supabase);
  if (!credentials) return { error: "Todavía no conectaste WhatsApp.", success: null };

  const result = await checkWhatsAppConnection(credentials.metaPhoneNumberId, credentials.metaAccessToken);
  if (!result.ok) {
    return { error: result.reason, success: null };
  }

  return {
    error: null,
    success: `Todo en orden: tu WhatsApp ${result.whatsappNumber} está conectado y el asistente puede responder.`,
  };
}

export async function saveWhatsappCredentialsAction(
  _prevState: WhatsappActionState,
  formData: FormData
): Promise<WhatsappActionState> {
  const parsed = whatsappCredentialsFormSchema.safeParse({
    whatsappNumber: formData.get("whatsappNumber"),
    metaPhoneNumberId: formData.get("metaPhoneNumberId"),
    metaAccessToken: formData.get("metaAccessToken"),
    metaVerifyToken: formData.get("metaVerifyToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", success: null };
  }

  try {
    await saveWhatsappCredentials(parsed.data);
    revalidatePath("/integraciones");
    return { error: null, success: "WhatsApp conectado." };
  } catch (err) {
    console.error("Error guardando las credenciales de WhatsApp.");
    return { error: err instanceof Error ? err.message : "No se pudo conectar WhatsApp.", success: null };
  }
}

export async function updateWhatsappStatusAction(sessionId: string, status: WhatsappConversationStatus): Promise<void> {
  const supabase = await createClient();
  await updateConversationStatus(supabase, sessionId, status);
  revalidatePath("/whatsapp");
}

export async function updateWhatsappInterestAction(sessionId: string, interestLevel: LeadInterestLevel): Promise<void> {
  const supabase = await createClient();
  await updateConversationInterest(supabase, sessionId, interestLevel);
  revalidatePath("/whatsapp");
}

export interface SendWhatsappReplyState {
  error: string | null;
}

/** Contesta manualmente desde el panel una conversación de WhatsApp (además de las respuestas automáticas del asistente). */
export async function sendWhatsappReplyAction(sessionId: string, body: string): Promise<SendWhatsappReplyState> {
  const parsed = whatsappReplySchema.safeParse({ body });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Mensaje inválido." };
  }

  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) return { error: "No se encontró el negocio del usuario." };

  const { data: session, error: sessionError } = await supabase
    .from("whatsapp_sessions")
    .select("id, customer_phone")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) return { error: "No se encontró la conversación." };

  const credentials = await getOwnWhatsappCredentials(clinic.id, supabase);
  if (!credentials) return { error: "Conectá WhatsApp en Integraciones antes de contestar desde acá." };

  try {
    await sendWhatsAppMessage({
      phoneNumberId: credentials.metaPhoneNumberId,
      accessToken: credentials.metaAccessToken,
      to: session.customer_phone,
      body: parsed.data.body,
    });
    await logWhatsappMessage(supabase, { clinicId: clinic.id, sessionId: session.id, role: "business", body: parsed.data.body });
    revalidatePath("/whatsapp");
    return { error: null };
  } catch (err) {
    console.error("Error enviando la respuesta manual de WhatsApp:", err);
    return { error: "No se pudo enviar el mensaje. Revisá que el Access Token de Meta en Integraciones siga vigente." };
  }
}
