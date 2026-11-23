-- Login con Facebook (Embedded Signup) como alternativa al formulario manual
-- de WhatsApp que ya existe — conviven los dos métodos. meta_verify_token
-- pasa a ser opcional porque las clínicas conectadas por este flujo
-- comparten un solo verify token de la app (env META_WEBHOOK_VERIFY_TOKEN)
-- en vez de uno propio por clínica.
alter table public.whatsapp_credentials
  alter column meta_verify_token drop not null,
  add column if not exists meta_waba_id text,
  add column if not exists meta_business_id text,
  add column if not exists meta_two_step_pin_encrypted text,
  add column if not exists connection_method text not null default 'manual' check (connection_method in ('manual', 'oauth'));
