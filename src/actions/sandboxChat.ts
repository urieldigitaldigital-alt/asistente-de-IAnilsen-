"use server";

import Anthropic from "@anthropic-ai/sdk";

export interface SandboxMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SandboxChatResult {
  reply: string;
  error: string | null;
}

const MODEL = "claude-haiku-4-5";

/**
 * Sandbox de "Probar": manda un mensaje de texto contra el system prompt
 * actual (aún sin publicar) usando Claude directo, sin tools ni voz — el
 * historial lo manda el cliente (ya lo tiene en su propio estado), no hace
 * falta guardar nada del lado del servidor.
 */
export async function sendSandboxMessageAction(
  systemPrompt: string,
  history: SandboxMessage[],
  message: string
): Promise<SandboxChatResult> {
  if (!message.trim()) {
    return { reply: "", error: "Escribe un mensaje para probar." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { reply: "", error: "ANTHROPIC_API_KEY no está configurada." };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
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
