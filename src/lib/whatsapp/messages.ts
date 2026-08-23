import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, WhatsappConversationStatus, WhatsappMessageRole } from "@/types/database";

/** Guarda un mensaje (del cliente o del asistente) y actualiza la fecha del último mensaje de la conversación. */
export async function logWhatsappMessage(
  admin: SupabaseClient<Database>,
  params: { clinicId: string; sessionId: string; role: WhatsappMessageRole; body: string }
): Promise<void> {
  const { clinicId, sessionId, role, body } = params;

  await admin.from("whatsapp_messages").insert({ clinic_id: clinicId, session_id: sessionId, role, body });
  await admin.from("whatsapp_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", sessionId);
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
