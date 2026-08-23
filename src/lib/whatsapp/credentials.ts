import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt, encrypt } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export interface WhatsappCredentialsInput {
  twilioAccountSid: string;
  twilioAuthToken: string;
  whatsappNumber: string;
}

export interface DecryptedWhatsappCredentials {
  twilioAccountSid: string;
  twilioAuthToken: string;
  whatsappNumber: string;
}

/** Guarda (o reemplaza) las credenciales de WhatsApp del negocio del usuario autenticado. */
export async function saveWhatsappCredentials(input: WhatsappCredentialsInput): Promise<void> {
  const supabase = await createClient();
  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { error } = await supabase.from("whatsapp_credentials").upsert(
    {
      clinic_id: clinic.id,
      twilio_account_sid: input.twilioAccountSid,
      twilio_auth_token_encrypted: encrypt(input.twilioAuthToken),
      whatsapp_number: input.whatsappNumber,
    },
    { onConflict: "clinic_id" }
  );
  if (error) throw error;
}

export async function hasWhatsappCredentials(clinicId: string, supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase.from("whatsapp_credentials").select("clinic_id").eq("clinic_id", clinicId).maybeSingle();
  return Boolean(data);
}

/** Credenciales de WhatsApp descifradas para un negocio, buscado por su clinic_id (uso: server actions con sesión). */
export async function getWhatsappCredentials(
  clinicId: string,
  supabase: SupabaseClient<Database>
): Promise<DecryptedWhatsappCredentials | null> {
  const { data, error } = await supabase
    .from("whatsapp_credentials")
    .select("twilio_account_sid, twilio_auth_token_encrypted, whatsapp_number")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    twilioAccountSid: data.twilio_account_sid,
    twilioAuthToken: decrypt(data.twilio_auth_token_encrypted),
    whatsappNumber: data.whatsapp_number,
  };
}

/** Credenciales de WhatsApp descifradas, buscadas por el número de WhatsApp receptor (uso: webhook, cliente admin). */
export async function getWhatsappCredentialsByNumber(
  whatsappNumber: string,
  supabase: SupabaseClient<Database>
): Promise<(DecryptedWhatsappCredentials & { clinicId: string }) | null> {
  const { data, error } = await supabase
    .from("whatsapp_credentials")
    .select("clinic_id, twilio_account_sid, twilio_auth_token_encrypted, whatsapp_number")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    clinicId: data.clinic_id,
    twilioAccountSid: data.twilio_account_sid,
    twilioAuthToken: decrypt(data.twilio_auth_token_encrypted),
    whatsappNumber: data.whatsapp_number,
  };
}
