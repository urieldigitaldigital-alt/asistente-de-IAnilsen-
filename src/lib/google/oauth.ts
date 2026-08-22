import type { SupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";

import { decrypt, encrypt } from "@/lib/crypto";
import type { Database } from "@/types/database";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildConsentUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await getOAuthClient().getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error(
      "Google no devolvió un refresh_token. Revoca el acceso previo en https://myaccount.google.com/permissions e inténtalo de nuevo."
    );
  }
  return tokens as { access_token: string; refresh_token: string; expiry_date: number; scope?: string };
}

export async function saveGoogleCredentials(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  tokens: { access_token: string; refresh_token: string; expiry_date: number; scope?: string }
): Promise<void> {
  const { error } = await supabase.from("google_credentials").upsert({
    clinic_id: clinicId,
    access_token_encrypted: encrypt(tokens.access_token),
    refresh_token_encrypted: encrypt(tokens.refresh_token),
    token_expires_at: new Date(tokens.expiry_date).toISOString(),
    scope: tokens.scope ?? GOOGLE_CALENDAR_SCOPES.join(" "),
  });
  if (error) throw error;
}

/** Devuelve un cliente OAuth2 autorizado y con el access token vigente (lo refresca si venció), o null si la clínica no conectó Google. */
export async function getAuthorizedClient(
  supabase: SupabaseClient<Database>,
  clinicId: string
): Promise<InstanceType<typeof google.auth.OAuth2> | null> {
  const { data: creds } = await supabase
    .from("google_credentials")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();
  if (!creds) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: decrypt(creds.access_token_encrypted),
    refresh_token: decrypt(creds.refresh_token_encrypted),
    expiry_date: new Date(creds.token_expires_at).getTime(),
  });

  const expiresSoon = new Date(creds.token_expires_at).getTime() <= Date.now() + 60_000;
  if (expiresSoon) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    if (credentials.access_token && credentials.expiry_date) {
      await supabase
        .from("google_credentials")
        .update({
          access_token_encrypted: encrypt(credentials.access_token),
          token_expires_at: new Date(credentials.expiry_date).toISOString(),
        })
        .eq("clinic_id", clinicId);
    }
  }

  return client;
}

export async function disconnectGoogle(supabase: SupabaseClient<Database>, clinicId: string): Promise<void> {
  const { error } = await supabase.from("google_credentials").delete().eq("clinic_id", clinicId);
  if (error) throw error;
}
