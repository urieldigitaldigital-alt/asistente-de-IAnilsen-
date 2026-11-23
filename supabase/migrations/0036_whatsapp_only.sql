-- Pivot a plataforma 100% WhatsApp: seguimiento automático a leads que no
-- contestaron, y estado de interés por conversación para el panel de CRM.
-- No se tocan ni se borran las tablas de llamadas/transcripciones/VAPI — el
-- producto deja de usarlas pero los datos históricos quedan intactos.
alter table public.agent_configs
  add column if not exists auto_follow_up_enabled boolean not null default true,
  add column if not exists follow_up_days integer not null default 2 check (follow_up_days between 1 and 14);

alter table public.whatsapp_sessions
  add column if not exists interest_level text not null default 'sin_evaluar' check (interest_level in ('sin_evaluar', 'interesado', 'no_interesado')),
  add column if not exists followed_up_at timestamptz;

-- Cron de seguimiento automático (correr a mano en el SQL Editor de Supabase,
-- igual que el de 0032_whatsapp_pending_reply.sql — requiere pg_cron y pg_net
-- ya habilitados):
--
-- select cron.schedule(
--   'whatsapp-send-followups',
--   '0 */6 * * *',
--   $$
--   select net.http_post(
--     url := 'https://TU_DOMINIO/api/whatsapp/send-followups',
--     headers := jsonb_build_object('x-cron-secret', 'EL_MISMO_VALOR_DE_WHATSAPP_CRON_SECRET', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
