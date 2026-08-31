import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildPersonalizedFirstMessage, findReturningCustomerOrderDetails } from "@/lib/vapi/personalization";
import { buildSystemPrompt } from "@/lib/vapi/promptBuilder";
import { buildAssistantTools } from "@/lib/vapi/tools";
import { dispatchToolCall, type ToolHandlerContext } from "@/lib/vapi/toolHandlers";
import type { AgentConfig, BusinessType, Clinic, Database } from "@/types/database";

const MODEL = "claude-haiku-4-5";
const MAX_TOOL_TURNS = 6;
// Si pasaron 5+ horas desde el mensaje anterior del cliente, tratamos este
// mensaje como si fuera el inicio de una conversación nueva (saludo fresco,
// se vuelve a ofrecer reusar los datos guardados) en vez de seguir el hilo
// como si no hubiera pasado el tiempo.
const NEW_DAY_GAP_HOURS = 5;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no está configurada.");
  return new Anthropic({ apiKey });
}

/**
 * Mismas tools que usan las llamadas (mismo `dispatchToolCall`, misma lógica
 * de negocio) traducidas al formato de Claude — sin las nativas de VAPI
 * (endCall/transferCall), que no aplican a una conversación de texto.
 */
function buildClaudeTools(businessType: BusinessType): Anthropic.Tool[] {
  return buildAssistantTools({ businessType })
    .filter((tool) => tool.type === "function" && tool.function)
    .map((tool) => {
      const fn = (tool as Extract<typeof tool, { type: "function" }>).function!;
      return {
        name: fn.name!,
        description: fn.description,
        input_schema: (fn.parameters ?? { type: "object", properties: {} }) as Anthropic.Tool.InputSchema,
      };
    });
}

export interface WhatsappConversation {
  id: string;
}

/** Busca (o crea) la conversación de WhatsApp para este negocio + número del cliente. */
export async function getOrCreateWhatsappSession(params: {
  clinicId: string;
  customerPhone: string;
  admin: SupabaseClient<Database>;
}): Promise<WhatsappConversation> {
  const { clinicId, customerPhone, admin } = params;

  const { data: existing } = await admin
    .from("whatsapp_sessions")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("customer_phone", customerPhone)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data: created, error } = await admin
    .from("whatsapp_sessions")
    .upsert({ clinic_id: clinicId, customer_phone: customerPhone }, { onConflict: "clinic_id,customer_phone" })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("No se pudo crear la conversación de WhatsApp.");

  return { id: created.id };
}

/**
 * Manda el mensaje entrante del cliente a Claude (con el mismo prompt y las
 * mismas herramientas que usan las llamadas, más el historial de la
 * conversación) y devuelve la respuesta final en texto, ejecutando las
 * tools que haga falta en el camino.
 */
export async function sendChatMessage(params: {
  admin: SupabaseClient<Database>;
  clinic: Clinic;
  config: AgentConfig;
  sessionId: string;
  customerPhone: string;
  input: string;
}): Promise<string | null> {
  const { admin, clinic, config, sessionId, customerPhone, input } = params;
  const anthropic = getAnthropicClient();

  // DESC + limit trae los 30 más RECIENTES (no los 30 más viejos); se
  // revierte después para mandarlos en orden cronológico como espera Claude.
  const { data: recentDesc } = await admin
    .from("whatsapp_messages")
    .select("role, body, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(30);
  const history = (recentDesc ?? []).slice().reverse();

  // El mensaje actual del cliente ya se guardó en whatsapp_messages antes de
  // llamar a esta función (ver api/whatsapp/webhook/route.ts), así que ya es
  // el último elemento de `history` — evita mandarlo duplicado a Claude.
  const lastEntry = history[history.length - 1];
  const currentAlreadyInHistory = lastEntry?.role === "customer" && lastEntry.body === input;
  const priorHistory = currentAlreadyInHistory ? history.slice(0, -1) : history;

  const messages: Anthropic.MessageParam[] = priorHistory.map((m) => ({
    role: m.role === "customer" ? "user" : "assistant",
    content: m.body,
  }));
  messages.push({ role: "user", content: input });

  const tools = buildClaudeTools(clinic.business_type);
  const lastPriorMessageAt = priorHistory[priorHistory.length - 1]?.created_at;
  const hoursSinceLastMessage = lastPriorMessageAt ? (Date.now() - new Date(lastPriorMessageAt).getTime()) / 3_600_000 : Infinity;
  // Conversación nueva o retomada después de un rato largo: usa el mismo
  // saludo de bienvenida/personalizado a cliente recurrente que las llamadas,
  // configurado en Personalización, y recién ahí vuelve a ofrecer reusar los
  // datos guardados de un pedido anterior.
  const isNewDay = priorHistory.length === 0 || hoursSinceLastMessage >= NEW_DAY_GAP_HOURS;
  const greeting = isNewDay ? await buildPersonalizedFirstMessage(admin, clinic, config, customerPhone) : null;
  const returningCustomer = isNewDay ? await findReturningCustomerOrderDetails(admin, clinic, customerPhone) : null;
  const system = buildSystemPrompt(clinic, config, {
    opening: greeting ? { channel: "whatsapp", greeting } : undefined,
    returningCustomer,
    channel: "whatsapp",
  });
  const ctx: ToolHandlerContext = { admin, clinic, config, callRowId: null };

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock && textBlock.type === "text" ? textBlock.text : null;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await dispatchToolCall(ctx, block.name, block.input);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return null;
}
