import type { NextConfig } from "next";

// Falla el build con un mensaje claro si falta una variable de entorno
// requerida, en vez de compilar "bien" y romperse en runtime con un error
// críptico (p. ej. NEXT_PUBLIC_* se hornea dentro del build de Next.js).
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  // VAPI_API_KEY ya no es global: cada negocio conecta su propia clave desde
  // Integraciones (tabla vapi_credentials, cifrada).
  "VAPI_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "APP_URL",
  "ENCRYPTION_KEY",
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno requeridas: ${missing.join(", ")}. ` +
      "Configúralas en tu hosting (Vercel: Settings → Environment Variables) o en .env.local antes de compilar. Ver .env.example."
  );
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
