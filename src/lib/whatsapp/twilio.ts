import { createHmac } from "node:crypto";

import { constantTimeEqual } from "@/lib/crypto";

/** Antepone "whatsapp:" si no lo tiene — así es como Twilio identifica remitente/destinatario de WhatsApp. */
function toWhatsappAddress(e164Number: string): string {
  return e164Number.startsWith("whatsapp:") ? e164Number : `whatsapp:${e164Number}`;
}

export interface SendWhatsAppMessageParams {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}

/** Envía un mensaje de WhatsApp saliente vía la API de Mensajería de Twilio. */
export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams): Promise<void> {
  const { accountSid, authToken, from, to, body } = params;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: toWhatsappAddress(from),
      To: toWhatsappAddress(to),
      Body: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Twilio rechazó el envío del mensaje de WhatsApp (${response.status}): ${text.slice(0, 300)}`);
  }
}

/**
 * Verifica que un request al webhook realmente venga de Twilio, siguiendo su
 * algoritmo de firma: https://www.twilio.com/docs/usage/security#validating-requests
 * (HMAC-SHA1 sobre la URL + los parámetros del POST ordenados alfabéticamente,
 * con el Auth Token del negocio como clave).
 */
export function verifyTwilioSignature(params: {
  authToken: string;
  url: string;
  formParams: Record<string, string>;
  signature: string;
}): boolean {
  const { authToken, url, formParams, signature } = params;

  const sortedKeys = Object.keys(formParams).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + formParams[key];
  }

  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  return constantTimeEqual(expected, signature);
}
