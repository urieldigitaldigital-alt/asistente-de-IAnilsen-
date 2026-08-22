import { NextResponse, type NextRequest } from "next/server";

import { exchangeCodeForTokens, saveGoogleCredentials } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";

function redirectToIntegrations(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/integraciones", request.url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return redirectToIntegrations(request, { google_error: "invalid_state" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) {
    return redirectToIntegrations(request, { google_error: "no_clinic" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveGoogleCredentials(supabase, clinic.id, tokens);
  } catch (err) {
    console.error("Error en callback de Google OAuth:", err);
    return redirectToIntegrations(request, { google_error: "exchange_failed" });
  }

  const response = redirectToIntegrations(request, { google_connected: "1" });
  response.cookies.delete("google_oauth_state");
  return response;
}
