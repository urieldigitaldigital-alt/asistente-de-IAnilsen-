import { VapiClient } from "@vapi-ai/server-sdk";

let cachedClient: VapiClient | null = null;

/** Cliente del SDK de servidor de VAPI. Solo se usa en código de servidor: la API key nunca llega al cliente. */
export function getVapiClient(): VapiClient {
  if (!cachedClient) {
    const token = process.env.VAPI_API_KEY;
    if (!token) {
      throw new Error("VAPI_API_KEY no está configurada.");
    }
    cachedClient = new VapiClient({ token });
  }
  return cachedClient;
}
