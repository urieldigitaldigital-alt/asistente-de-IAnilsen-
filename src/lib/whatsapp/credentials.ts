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

/**
 * Guarda (o actualiza) las credenciales de WhatsApp (Meta Cloud API) del
 * negocio del usuario autenticado. El Access Token nunca se precarga en el
 * formulario (es secreto) — si llega vacío, se interpreta como "no cambiar"
 * y se conserva el que ya estaba guardado.
 */
export async function saveWhatsappCredentials(input: WhatsappCredentialsInput): Promise<void> {
  const supabase = await createClient();
  const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id").single();
  if (clinicError || !clinic) throw new Error("No se encontró el negocio del usuario.");

  const record: {
    clinic_id: string;
    whatsapp_number: string;
    meta_phone_number_id: string;
    meta_verify_token: string;
    meta_access_token_encrypted?: string;
  } = {
    clinic_id: clinic.id,
    whatsapp_number: input.whatsappNumber,
    meta_phone_number_id: input.metaPhoneNumberId,
    meta_verify_token: encrypt(input.metaVerifyToken),
  };

  if (input.metaAccessToken) {
    record.meta_access_token_encrypted = encrypt(input.metaAccessToken);
  } else {
    const alreadyConnected = await hasWhatsappCredentials(clinic.id, supabase);
    if (!alreadyConnected) throw new Error("Falta el Access Token de Meta.");
  }

  // El tipo generado exige meta_access_token_encrypted (columna not null), pero acá se omite
  // a propósito cuando ya existe una fila: PostgREST solo actualiza las columnas presentes en
  // el payload, así que el token guardado queda intacto en ese caso.
  const { error } = await supabase
    .from("whatsapp_credentials")
    .upsert(record as Database["public"]["Tables"]["whatsapp_credentials"]["Insert"], { onConflict: "clinic_id" });
  if (error) throw error;
}

export async function hasWhatsappCredentials(clinicId: string, supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase.from("whatsapp_credentials").select("clinic_id").eq("clinic_id", clinicId).maybeSingle();
  return Boolean(data);
}

export interface WhatsappCredentialsSummary {
  whatsappNumber: string;
  metaPhoneNumberId: string;
  metaVerifyToken: string;
}

/** Datos ya guardados, no secretos, para precargar el formulario de Integraciones (el Access Token nunca se muestra). */
export async function getWhatsappCredentialsSummary(
  clinicId: string,
  supabase: SupabaseClient<Database>
): Promise<WhatsappCredentialsSummary | null> {
  const { data } = await supabase
    .from("whatsapp_credentials")
    .select("whatsapp_number, meta_phone_number_id, meta_verify_token")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!data) return null;
  return {
    whatsappNumber: data.whatsapp_number,
    metaPhoneNumberId: data.meta_phone_number_id,
    metaVerifyToken: decrypt(data.meta_verify_token),
  };
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

/** Credenciales descifradas del propio negocio del usuario autenticado (respeta RLS) — uso: responder manualmente desde el panel. */
export async function getOwnWhatsappCredentials(
  clinicId: string,
  supabase: SupabaseClient<Database>
): Promise<DecryptedWhatsappCredentials | null> {
  const { data, error } = await supabase
    .from("whatsapp_credentials")
    .select("whatsapp_number, meta_phone_number_id, meta_access_token_encrypted, meta_verify_token")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
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
