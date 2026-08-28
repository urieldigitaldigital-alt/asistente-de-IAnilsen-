import Retell from "retell-sdk";

/**
 * Cliente del SDK de servidor de Retell para la cuenta de un negocio
 * concreto. Cada negocio conecta su propia API key (ver
 * lib/retell/credentials.ts) — no hay una clave global compartida, así que
 * no se cachea entre negocios. Solo se usa en código de servidor: la API key
 * nunca llega al cliente.
 */
export function getRetellClient(apiKey: string): Retell {
  return new Retell({ apiKey });
}
