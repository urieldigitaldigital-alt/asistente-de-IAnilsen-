const GRAPH_API_VERSION = "v21.0";

export interface SendWhatsAppMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}

/** Envía un mensaje de WhatsApp saliente vía la Cloud API de Meta. */
export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams): Promise<void> {
  const { phoneNumberId, accessToken, to, body } = params;
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      // Meta espera el número sin "+" ni espacios.
      to: to.replace(/^\+/, "").replace(/\s+/g, ""),
      type: "text",
      text: { body },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Meta rechazó el envío del mensaje de WhatsApp (${response.status}): ${text.slice(0, 300)}`);
  }
}

export interface MetaInboundMessage {
  phoneNumberId: string;
  from: string;
  body: string;
}

/** Extrae el primer mensaje de texto entrante de un payload de webhook de la Cloud API de Meta, si lo hay. */
export function parseMetaWebhookPayload(payload: unknown): MetaInboundMessage | null {
  const entry = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entry)) return null;

  for (const entryItem of entry) {
    const changes = (entryItem as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      const phoneNumberId = (value?.metadata as { phone_number_id?: string } | undefined)?.phone_number_id;
      const messages = value?.messages as Array<{ from?: string; text?: { body?: string }; type?: string }> | undefined;
      const message = messages?.[0];
      if (phoneNumberId && message?.from && message.type === "text" && message.text?.body) {
        return { phoneNumberId, from: message.from, body: message.text.body };
      }
    }
  }

  return null;
}
