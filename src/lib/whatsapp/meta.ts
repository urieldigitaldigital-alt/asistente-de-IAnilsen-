import { randomInt } from "node:crypto";

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
  /** ID único del mensaje (wamid) — Meta reintenta la entrega del webhook si no responde rápido, así que sirve para no procesar el mismo mensaje dos veces. */
  waMessageId: string | null;
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
      const messages = value?.messages as
        | Array<{ id?: string; from?: string; text?: { body?: string }; type?: string }>
        | undefined;
      const message = messages?.[0];
      if (phoneNumberId && message?.from && message.type === "text" && message.text?.body) {
        return { phoneNumberId, from: message.from, body: message.text.body, waMessageId: message.id ?? null };
      }
    }
  }

  return null;
}

function getEmbeddedSignupAppCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Faltan META_APP_ID o META_APP_SECRET.");
  return { appId, appSecret };
}

/** Cambia el "code" que entrega el login de Facebook por un access token — sin redirect_uri, como funciona este endpoint específico de Meta (no es el OAuth genérico). */
export async function exchangeEmbeddedSignupCode(code: string): Promise<string> {
  const { appId, appSecret } = getEmbeddedSignupAppCredentials();
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Meta rechazó el intercambio del código de Embedded Signup (${response.status}): ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Meta no devolvió un access_token.");
  return data.access_token;
}

/** Suscribe el WABA elegido por el usuario a los webhooks de nuestra app — paso obligatorio para que empiecen a llegarnos sus mensajes. */
export async function subscribeWabaToApp(wabaId: string, accessToken: string): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`;
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`No se pudo suscribir el WABA a los webhooks (${response.status}): ${text.slice(0, 300)}`);
  }
}

/** Lee el número de WhatsApp real (para mostrarlo en el panel) a partir del Phone Number ID que entrega el Embedded Signup. */
export async function fetchPhoneNumberDisplay(phoneNumberId: string, accessToken: string): Promise<string> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`No se pudo leer el número de WhatsApp (${response.status}): ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as { display_phone_number?: string };
  if (!data.display_phone_number) throw new Error("Meta no devolvió el número de WhatsApp.");
  const digits = data.display_phone_number.replace(/[^\d]/g, "");
  return `+${digits}`;
}

/** Registra el número en la Cloud API con un PIN de verificación en dos pasos — obligatorio la primera vez que un número se usa con la API. Si ya estaba registrado (reconexión), Meta devuelve error y lo ignoramos. */
export async function registerPhoneNumber(phoneNumberId: string, accessToken: string, pin: string): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/register`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (!text.toLowerCase().includes("already")) {
      throw new Error(`No se pudo registrar el número en la Cloud API (${response.status}): ${text.slice(0, 300)}`);
    }
  }
}

export type WhatsAppConnectionCheck =
  | { ok: true; whatsappNumber: string; verifiedName: string | null }
  | { ok: false; reason: string; tokenExpired: boolean };

/**
 * Pregunta a Meta por el número conectado para confirmar que la conexión
 * sigue viva — es lo que respalda el botón "Probar ahora" del panel. Traduce
 * el error de Meta a algo que un dueño de negocio pueda accionar en vez de
 * mostrar el código crudo.
 */
export async function checkWhatsAppConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<WhatsAppConnectionCheck> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    return { ok: false, reason: "No pudimos comunicarnos con Meta. Revisá tu conexión y probá de nuevo.", tokenExpired: false };
  }

  const data = (await response.json().catch(() => ({}))) as {
    display_phone_number?: string;
    verified_name?: string;
    error?: { code?: number; message?: string };
  };

  if (!response.ok) {
    // 190 = token vencido o revocado (el dueño sacó el permiso desde
    // Facebook, o el token temporal de 24h del modo de prueba expiró).
    const tokenExpired = data.error?.code === 190;
    return {
      ok: false,
      tokenExpired,
      reason: tokenExpired
        ? "El permiso de Meta se venció o fue revocado. Volvé a conectar WhatsApp con un clic para renovarlo."
        : "Meta rechazó la consulta. Volvé a conectar WhatsApp para reparar la conexión.",
    };
  }

  if (!data.display_phone_number) {
    return { ok: false, reason: "Meta no devolvió el número conectado. Probá reconectar WhatsApp.", tokenExpired: false };
  }

  return {
    ok: true,
    whatsappNumber: `+${data.display_phone_number.replace(/[^\d]/g, "")}`,
    verifiedName: data.verified_name ?? null,
  };
}

/** PIN de verificación en dos pasos para el registro del número — se guarda cifrado por si hace falta re-registrar el número más adelante. */
export function generateTwoStepPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
