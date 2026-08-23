const BILLING_KEYWORDS = ["credit card", "payment method", "insufficient", "credits", "quota", "balance"];
const AUTH_KEYWORDS = ["unauthorized", "unauthenticated", "invalid key", "invalid token", "401"];
// Cuando VAPI devuelve un cuerpo no-JSON (ej. el texto plano "Unauthorized"),
// el SDK intenta parsearlo como JSON y el error termina siendo un
// "Unexpected token... is not valid JSON" en vez del problema real.
const JSON_PARSE_KEYWORDS = ["is not valid json", "unexpected token"];

/**
 * VAPI devuelve errores crudos tipo `Status code: 400 Body: {...}` (o incluso
 * fallos de parseo de JSON cuando el cuerpo de la respuesta no es JSON). Los
 * traducimos a un mensaje claro en vez de mostrarlos tal cual al dueño del negocio.
 */
export function friendlyVapiError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (BILLING_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "Tu cuenta de VAPI se quedó sin saldo o necesita una tarjeta cargada. Entrá a vapi.ai → Settings → Billing, recargá, y volvé a intentar.";
  }

  if (AUTH_KEYWORDS.some((keyword) => lower.includes(keyword)) || JSON_PARSE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "Tu clave de API de VAPI no es válida o no está conectada. Volvé a pegarla en Integraciones → Tu cuenta de VAPI (Settings → API Keys → Private Key en vapi.ai).";
  }

  return message || fallback;
}
