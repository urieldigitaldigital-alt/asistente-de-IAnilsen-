import type Retell from "retell-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt, encrypt } from "@/lib/crypto";
import { getRetellClient as buildRetellClient } from "@/lib/retell/client";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/** Guarda (o reemplaza) la API key de Retell del negocio del usuario autenticado, cifrada. */
export async function saveRetellApiKey(apiKey: string): Promise<void> {
  const supabase = await createClient();
  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { error } = await supabase
    .from("retell_credentials")
    .upsert({ clinic_id: clinic.id, api_key_encrypted: encrypt(apiKey) }, { onConflict: "clinic_id" });
  if (error) throw error;
}

export async function hasRetellCredentials(clinicId: string, supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase.from("retell_credentials").select("clinic_id").eq("clinic_id", clinicId).maybeSingle();
  return Boolean(data);
}

/** Descifra la API key de Retell del negocio indicado — usada para verificar la firma de sus webhooks. */
export async function getTenantRetellApiKey(clinicId: string, supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data, error } = await supabase
    .from("retell_credentials")
    .select("api_key_encrypted")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return decrypt(data.api_key_encrypted);
}

/** Cliente de Retell para el negocio indicado, usando su propia API key conectada. */
export async function getTenantRetellClient(clinicId: string, supabase: SupabaseClient<Database>): Promise<Retell> {
  const apiKey = await getTenantRetellApiKey(clinicId, supabase);
  if (!apiKey) {
    throw new Error("Todavía no conectaste tu cuenta de Retell. Pegá tu clave de API en Integraciones.");
  }
  return buildRetellClient(apiKey);
}
