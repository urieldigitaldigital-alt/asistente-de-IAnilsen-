import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildPersonalizedFirstMessage, findReturningCustomerOrderDetails } from "@/lib/vapi/personalization";
import { buildSystemPrompt } from "@/lib/vapi/promptBuilder";
import { buildAssistantTools } from "@/lib/vapi/tools";
import { dispatchToolCall, type ToolHandlerContext } from "@/lib/vapi/toolHandlers";
import type { AgentConfig, BusinessType, Clinic, Database } from "@/types/database";

const MODEL = "claude-haiku-4-5";
const MAX_TOOL_TURNS = 6;

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

  const { data: history } = await admin
    .from("whatsapp_messages")
    .select("role, body")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(30);

  const messages: Anthropic.MessageParam[] = (history ?? []).map((m) => ({
    role: m.role === "customer" ? "user" : "assistant",
    content: m.body,
  }));
  messages.push({ role: "user", content: input });

  const tools = buildClaudeTools(clinic.business_type);
  // Primer mensaje de la conversación (sin historial previo): usa el mismo
  // saludo de bienvenida/personalizado a cliente recurrente que las llamadas,
  // configurado en Personalización.
  const isFirstMessage = !history || history.length === 0;
  const greeting = isFirstMessage ? await buildPersonalizedFirstMessage(admin, clinic, config, customerPhone) : null;
  const returningCustomer = await findReturningCustomerOrderDetails(admin, clinic, customerPhone);
  const system = buildSystemPrompt(clinic, config, greeting ? { channel: "whatsapp", greeting } : undefined, returningCustomer);
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
