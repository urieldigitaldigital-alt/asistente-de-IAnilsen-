const BILLING_KEYWORDS = ["credit card", "payment method", "insufficient", "credits", "quota", "balance"];

/**
 * VAPI devuelve errores crudos tipo `Status code: 400 Body: {...}` cuando la
 * cuenta se queda sin saldo o sin tarjeta cargada. Los traducimos a un
 * mensaje claro en vez de mostrar el JSON tal cual al dueño del negocio.
 */
export function friendlyVapiError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (BILLING_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "Tu cuenta de VAPI se quedó sin saldo o necesita una tarjeta cargada. Entrá a vapi.ai → Settings → Billing, recargá, y volvé a intentar.";
  }

  return message || fallback;
}
