import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt, encrypt } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export interface WhatsappCredentialsInput {
  whatsappNumber: string;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaVerifyToken: string;
}

export interface DecryptedWhatsappCredentials {
  whatsappNumber: string;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaVerifyToken: string;
}

/** Guarda (o reemplaza) las credenciales de WhatsApp (Meta Cloud API) del negocio del usuario autenticado. */
export async function saveWhatsappCredentials(input: WhatsappCredentialsInput): Promise<void> {
  const supabase = await createClient();
  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const { error } = await supabase.from("whatsapp_credentials").upsert(
    {
      clinic_id: clinic.id,
      whatsapp_number: input.whatsappNumber,
      meta_phone_number_id: input.metaPhoneNumberId,
      meta_access_token_encrypted: encrypt(input.metaAccessToken),
      meta_verify_token: encrypt(input.metaVerifyToken),
    },
    { onConflict: "clinic_id" }
  );
  if (error) throw error;
}

export async function hasWhatsappCredentials(clinicId: string, supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase.from("whatsapp_credentials").select("clinic_id").eq("clinic_id", clinicId).maybeSingle();
  return Boolean(data);
}

/** Credenciales descifradas, buscadas por el Phone Number ID de Meta que recibió el mensaje (uso: webhook, cliente admin). */
export async function getWhatsappCredentialsByPhoneNumberId(
  metaPhoneNumberId: string,
  supabase: SupabaseClient<Database>
): Promise<(DecryptedWhatsappCredentials & { clinicId: string }) | null> {
  const { data, error } = await supabase
    .from("whatsapp_credentials")
    .select("clinic_id, whatsapp_number, meta_phone_number_id, meta_access_token_encrypted, meta_verify_token")
    .eq("meta_phone_number_id", metaPhoneNumberId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    clinicId: data.clinic_id,
    whatsappNumber: data.whatsapp_number,
    metaPhoneNumberId: data.meta_phone_number_id,
    metaAccessToken: decrypt(data.meta_access_token_encrypted),
    metaVerifyToken: decrypt(data.meta_verify_token),
  };
}

/** Busca, entre todos los negocios, el que tenga este verify token — usado en la verificación GET del webhook de Meta. */
export async function findClinicByVerifyToken(
  verifyToken: string,
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const { data } = await supabase.from("whatsapp_credentials").select("clinic_id, meta_verify_token");
  const match = (data ?? []).find((row) => {
    try {
      return decrypt(row.meta_verify_token) === verifyToken;
    } catch {
      return false;
    }
  });
  return match?.clinic_id ?? null;
}
