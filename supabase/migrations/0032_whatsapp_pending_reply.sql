-- Respuestas de WhatsApp demoradas (no instantáneas) para sonar más humano:
-- en vez de contestar apenas llega un mensaje, se guarda "cuándo toca"
-- responder (con debounce: si llegan más mensajes del mismo cliente antes de
-- esa hora, se pospone) y un cron periódico dispara la respuesta real —
-- ver src/app/api/whatsapp/process-pending/route.ts.
alter table public.whatsapp_sessions add column if not exists pending_reply_at timestamptz;
create index if not exists whatsapp_sessions_pending_reply_at_idx
  on public.whatsapp_sessions (pending_reply_at) where pending_reply_at is not null;

-- Configuración del cron (se corre una sola vez en el SQL Editor, no acá,
-- porque necesita el secreto real de WHATSAPP_CRON_SECRET — dejar
-- documentado el shape exacto para referencia futura):
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--   'whatsapp-process-pending-replies',
--   '* * * * *', -- cada 1 minuto
--   $$
--   select net.http_post(
--     url := 'https://www.asistentnilsenia.com/api/whatsapp/process-pending',
--     headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<WHATSAPP_CRON_SECRET real>'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
