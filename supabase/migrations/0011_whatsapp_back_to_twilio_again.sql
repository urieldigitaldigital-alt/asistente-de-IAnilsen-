-- 0011_whatsapp_back_to_twilio_again.sql
-- Vuelve de Meta Cloud API a Twilio para WhatsApp (Meta también pide
-- tarjeta cargada para el número de prueba, igual que VAPI para su número).

alter table public.whatsapp_credentials
  drop column meta_phone_number_id,
  drop column meta_access_token_encrypted,
  drop column meta_verify_token,
  add column twilio_account_sid text not null,
  add column twilio_auth_token_encrypted text not null;
