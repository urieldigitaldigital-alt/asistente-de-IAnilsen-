"use server";

import Anthropic from "@anthropic-ai/sdk";

export interface SandboxChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SandboxChatResult {
  reply: string;
  error: string | null;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no está configurada.");
  return new Anthropic({ apiKey });
}

/**
 * Sandbox de "Probar": manda un mensaje de texto contra el system prompt
 * actual (aún sin guardar), con el mismo modelo que usa WhatsApp en
 * producción (ver lib/whatsapp/chat.ts) — sin tools ni escrituras reales, así
 * que no agenda ni guarda nada de verdad.
 */
export async function sendSandboxMessageAction(
  systemPrompt: string,
  history: SandboxChatMessage[],
  message: string
): Promise<SandboxChatResult> {
  if (!message.trim()) {
    return { reply: "", error: "Escribe un mensaje para probar." };
  }

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...history, { role: "user", content: message }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return { reply: textBlock && textBlock.type === "text" ? textBlock.text : "(sin respuesta)", error: null };
  } catch (err) {
    console.error("Error en sandbox de chat:", err);
    return { reply: "", error: err instanceof Error ? err.message : "Error al probar el prompt." };
  }
}
