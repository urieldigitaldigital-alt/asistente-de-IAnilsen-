-- 0009_whatsapp_back_to_twilio.sql
-- Vuelve de Meta Cloud API a Twilio para WhatsApp: registrar el número real
-- como WhatsApp Sender en Twilio no requiere que el dueño del negocio cree su
-- propia cuenta de desarrollador de Meta (Twilio ya tiene esa relación con
-- Meta) — evita el bloqueo de verificación de cuenta que da Facebook al
-- crear una cuenta de developers.facebook.com nueva.

alter table public.whatsapp_credentials
  drop column meta_phone_number_id,
  drop column meta_access_token_encrypted,
  drop column meta_verify_token,
  add column twilio_account_sid text not null,
  add column twilio_auth_token_encrypted text not null;
