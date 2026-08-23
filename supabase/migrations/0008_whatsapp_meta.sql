-- 0008_whatsapp_meta.sql
-- Cambia la integración de WhatsApp de Twilio a la API directa de Meta
-- (WhatsApp Cloud API) — Twilio pedía un paso de conexión (Sandbox) poco
-- confiable para usuarios no técnicos; Meta permite probar al instante con
-- un número de prueba propio, sin ese paso.

alter table public.whatsapp_credentials
  drop column twilio_account_sid,
  drop column twilio_auth_token_encrypted,
  add column meta_phone_number_id text not null,
  add column meta_access_token_encrypted text not null,
  add column meta_verify_token text not null;
