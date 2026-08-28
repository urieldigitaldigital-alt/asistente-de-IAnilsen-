import Retell from "retell-sdk";

/**
 * Retell tira errores tipados (Retell.APIError con subclases por código
 * HTTP), a diferencia de VAPI que solo da texto libre — así que acá
 * distinguimos por `err.status` en vez de buscar palabras clave.
 */
export function friendlyRetellError(err: unknown, fallback: string): string {
  if (err instanceof Retell.APIError) {
    if (err.status === 402) {
      return "Tu cuenta de Retell se quedó sin saldo. Entrá a retellai.com → Billing, recargá, y volvé a intentar.";
    }
    if (err.status === 401) {
      return "Tu clave de API de Retell no es válida o no está conectada. Volvé a pegarla en Integraciones → Tu cuenta de Retell (retellai.com → API Keys).";
    }
    if (err.status === 403) {
      return "Tu cuenta de Retell no tiene permiso para esta acción. Revisá los permisos de tu API key en retellai.com.";
    }
    if (err.status === 429) {
      return "Retell está limitando las solicitudes por ahora. Esperá un momento y volvé a intentar.";
    }
    const message = typeof err.error === "object" && err.error && "message" in err.error ? String((err.error as { message?: unknown }).message) : err.message;
    return message || fallback;
  }

  return err instanceof Error ? err.message || fallback : fallback;
}
