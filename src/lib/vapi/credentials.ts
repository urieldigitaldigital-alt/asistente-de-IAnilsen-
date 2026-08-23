import type { VapiClient } from "@vapi-ai/server-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt, encrypt } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { getVapiClient as buildVapiClient } from "@/lib/vapi/client";
import type { Database } from "@/types/database";

/** Guarda (o reemplaza) la API key de VAPI del negocio del usuario autenticado, cifrada. */
export async function saveVapiApiKey(apiKey: string): Promise<void> {
  const supabase = await createClient();
  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { error } = await supabase
    .from("vapi_credentials")
    .upsert({ clinic_id: clinic.id, api_key_encrypted: encrypt(apiKey) }, { onConflict: "clinic_id" });
  if (error) throw error;
}

export async function hasVapiCredentials(clinicId: string, supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase.from("vapi_credentials").select("clinic_id").eq("clinic_id", clinicId).maybeSingle();
  return Boolean(data);
}

/** Cliente de VAPI para el negocio indicado, usando su propia API key conectada. */
export async function getTenantVapiClient(clinicId: string, supabase: SupabaseClient<Database>): Promise<VapiClient> {
  const { data, error } = await supabase
    .from("vapi_credentials")
    .select("api_key_encrypted")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error("Todavía no conectaste tu cuenta de VAPI. Pegá tu clave de API en Integraciones.");
  }
  return buildVapiClient(decrypt(data.api_key_encrypted));
}
