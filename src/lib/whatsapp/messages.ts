import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, WhatsappConversationStatus, WhatsappMessageRole } from "@/types/database";

/**
 * Guarda un mensaje (del cliente o del asistente) y actualiza la fecha del
 * último mensaje de la conversación. Si `waMessageId` ya existe (carrera
 * entre dos entregas casi simultáneas del mismo webhook de Meta, el chequeo
 * previo en la ruta no siempre la agarra), devuelve `duplicate: true` en vez
 * de insertar de nuevo — el índice único de la migración 0027 es la última
 * línea de defensa contra pedidos duplicados.
 */
export async function logWhatsappMessage(
  admin: SupabaseClient<Database>,
  params: { clinicId: string; sessionId: string; role: WhatsappMessageRole; body: string; waMessageId?: string | null }
): Promise<{ duplicate: boolean }> {
  const { clinicId, sessionId, role, body, waMessageId } = params;

  const { error } = await admin
    .from("whatsapp_messages")
    .insert({ clinic_id: clinicId, session_id: sessionId, role, body, wa_message_id: waMessageId ?? null });
  if (error) {
    if (error.code === "23505") return { duplicate: true };
    throw error;
  }
  await admin.from("whatsapp_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", sessionId);
  return { duplicate: false };
}

/** Cambia el estado de seguimiento de una conversación (usado desde el panel, respeta RLS). */
export async function updateConversationStatus(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  status: WhatsappConversationStatus
): Promise<void> {
  const { error } = await supabase.from("whatsapp_sessions").update({ status }).eq("id", sessionId);
  if (error) throw error;
}
