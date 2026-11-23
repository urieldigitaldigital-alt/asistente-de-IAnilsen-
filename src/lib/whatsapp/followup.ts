import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildSystemPrompt } from "@/lib/assistant/promptBuilder";
import { logWhatsappMessage } from "@/lib/whatsapp/messages";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta";
import type { AgentConfig, Clinic, Database } from "@/types/database";

const MODEL = "claude-sonnet-5";

const FOLLOW_UP_INSTRUCTION =
  "\n\n## Mensaje de seguimiento automático\nEsta persona dejó de responder hace un tiempo. Escribí un único mensaje breve y natural (1-2 frases) para retomar la conversación — no repitas textualmente nada de lo que ya dijiste antes, no hagas una pregunta que ya hiciste, y no sueltes un genérico \"¿seguís ahí?\": retomá algo concreto de lo que se había hablado. No uses ningún tool en este mensaje.";

export interface DueFollowUpSession {
  id: string;
  clinic_id: string;
  customer_phone: string;
  customer_name: string | null;
}

/** Conversaciones donde el negocio habló último hace `follow_up_days` o más, sin que el cliente contestara, y que todavía no recibieron su (único) mensaje de seguimiento. */
export async function findDueFollowUpSessions(admin: SupabaseClient<Database>): Promise<DueFollowUpSession[]> {
  const { data: configs } = await admin
    .from("agent_configs")
    .select("clinic_id, follow_up_days")
    .eq("auto_follow_up_enabled", true);
  if (!configs || configs.length === 0) return [];

  const due: DueFollowUpSession[] = [];
  for (const cfg of configs) {
    const threshold = new Date(Date.now() - cfg.follow_up_days * 24 * 60 * 60_000).toISOString();
    const { data: sessions } = await admin
      .from("whatsapp_sessions")
      .select("id, clinic_id, customer_phone, customer_name")
      .eq("clinic_id", cfg.clinic_id)
      .neq("status", "resolved")
      .neq("interest_level", "no_interesado")
      .is("followed_up_at", null)
      .lte("last_message_at", threshold);
    if (sessions) due.push(...sessions);
  }
  return due;
}

/**
 * Genera y manda el mensaje de seguimiento de una conversación puntual, si
 * corresponde — nunca interrumpe un intercambio en curso: solo actúa si el
 * último mensaje de la conversación es del negocio (el cliente es quien dejó
 * de contestar, no al revés).
 */
export async function sendFollowUpMessage(params: {
  admin: SupabaseClient<Database>;
  clinic: Clinic;
  config: AgentConfig;
  session: DueFollowUpSession;
  credentials: { metaPhoneNumberId: string; metaAccessToken: string };
}): Promise<boolean> {
  const { admin, clinic, config, session, credentials } = params;

  const { data: lastMessage } = await admin
    .from("whatsapp_messages")
    .select("role")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastMessage || lastMessage.role === "customer") return false;

  const { data: recentDesc } = await admin
    .from("whatsapp_messages")
    .select("role, body")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const history = (recentDesc ?? []).slice().reverse();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no está configurada.");
  const anthropic = new Anthropic({ apiKey });

  const system = buildSystemPrompt(clinic, config) + FOLLOW_UP_INSTRUCTION;
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "customer" ? "user" : "assistant",
    content: m.body,
  }));
  messages.push({ role: "user", content: "(Generá el mensaje de seguimiento ahora.)" });

  const response = await anthropic.messages.create({ model: MODEL, max_tokens: 300, system, messages });
  const textBlock = response.content.find((block) => block.type === "text");
  const followUpText = textBlock && textBlock.type === "text" ? textBlock.text.trim() : null;
  if (!followUpText) return false;

  await logWhatsappMessage(admin, { clinicId: clinic.id, sessionId: session.id, role: "assistant", body: followUpText });
  await sendWhatsAppMessage({
    phoneNumberId: credentials.metaPhoneNumberId,
    accessToken: credentials.metaAccessToken,
    to: session.customer_phone,
    body: followUpText,
  });
  await admin.from("whatsapp_sessions").update({ followed_up_at: new Date().toISOString() }).eq("id", session.id);

  return true;
}
