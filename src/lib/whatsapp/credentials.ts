import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt, encrypt } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import type { Database, WhatsappConnectionMethod } from "@/types/database";

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
  metaVerifyToken: string | null;
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
    connection_method: WhatsappConnectionMethod;
    meta_access_token_encrypted?: string;
  } = {
    clinic_id: clinic.id,
    whatsapp_number: input.whatsappNumber,
    meta_phone_number_id: input.metaPhoneNumberId,
    meta_verify_token: encrypt(input.metaVerifyToken),
    connection_method: "manual",
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
  metaVerifyToken: string | null;
  connectionMethod: WhatsappConnectionMethod;
}

/** Datos ya guardados, no secretos, para precargar el formulario de Integraciones (el Access Token nunca se muestra). */
export async function getWhatsappCredentialsSummary(
  clinicId: string,
  supabase: SupabaseClient<Database>
): Promise<WhatsappCredentialsSummary | null> {
  const { data } = await supabase
    .from("whatsapp_credentials")
    .select("whatsapp_number, meta_phone_number_id, meta_verify_token, connection_method")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!data) return null;
  return {
    whatsappNumber: data.whatsapp_number,
    metaPhoneNumberId: data.meta_phone_number_id,
    metaVerifyToken: data.meta_verify_token ? decrypt(data.meta_verify_token) : null,
    connectionMethod: data.connection_method,
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
    metaVerifyToken: data.meta_verify_token ? decrypt(data.meta_verify_token) : null,
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
    metaVerifyToken: data.meta_verify_token ? decrypt(data.meta_verify_token) : null,
  };
}

/** Busca, entre todos los negocios, el que tenga este verify token — usado en la verificación GET del webhook de Meta (clínicas conectadas a mano, cada una con su propio Meta App y su propio token; las conectadas por Facebook Login comparten un token de app único, ver META_WEBHOOK_VERIFY_TOKEN). */
export async function findClinicByVerifyToken(
  verifyToken: string,
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const { data } = await supabase.from("whatsapp_credentials").select("clinic_id, meta_verify_token");
  const match = (data ?? []).find((row) => {
    if (!row.meta_verify_token) return false;
    try {
      return decrypt(row.meta_verify_token) === verifyToken;
    } catch {
      return false;
    }
  });
  return match?.clinic_id ?? null;
}

export interface SaveEmbeddedSignupInput {
  clinicId: string;
  wabaId: string;
  businessId: string;
  phoneNumberId: string;
  whatsappNumber: string;
  accessToken: string;
  twoStepPin: string;
}

/** Guarda las credenciales obtenidas por Login con Facebook (Embedded Signup) — mismo destino que el formulario manual, pero sin verify token propio (usa el de la app) y marcando el método de conexión. */
export async function saveEmbeddedSignupCredentials(
  supabase: SupabaseClient<Database>,
  input: SaveEmbeddedSignupInput
): Promise<void> {
  const { error } = await supabase.from("whatsapp_credentials").upsert(
    {
      clinic_id: input.clinicId,
      whatsapp_number: input.whatsappNumber,
      meta_phone_number_id: input.phoneNumberId,
      meta_access_token_encrypted: encrypt(input.accessToken),
      meta_waba_id: input.wabaId,
      meta_business_id: input.businessId,
      meta_two_step_pin_encrypted: encrypt(input.twoStepPin),
      meta_verify_token: null,
      connection_method: "oauth",
    },
    { onConflict: "clinic_id" }
  );
  if (error) throw error;
}
