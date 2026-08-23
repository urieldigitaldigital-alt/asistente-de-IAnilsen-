-- 0010_whatsapp_meta_again.sql
-- Vuelve de Twilio a la Cloud API directa de Meta para WhatsApp.

alter table public.whatsapp_credentials
  drop column twilio_account_sid,
  drop column twilio_auth_token_encrypted,
  add column meta_phone_number_id text not null,
  add column meta_access_token_encrypted text not null,
  add column meta_verify_token text not null;
