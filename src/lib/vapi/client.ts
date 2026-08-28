import { VapiClient } from "@vapi-ai/server-sdk";

/**
 * Cliente del SDK de servidor de VAPI para la cuenta de un negocio concreto.
 * Cada negocio conecta su propia API key (ver lib/vapi/credentials.ts) — no
 * hay una clave global compartida, así que no se cachea entre negocios.
 * Solo se usa en código de servidor: la API key nunca llega al cliente.
 */
export function getVapiClient(apiKey: string): VapiClient {
  return new VapiClient({ token: apiKey });
}
