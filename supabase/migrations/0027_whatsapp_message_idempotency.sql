-- 0027_whatsapp_message_idempotency.sql
-- Guarda el ID único que manda Meta por cada mensaje entrante (wamid) para
-- poder detectar reentregas del mismo webhook y no procesarlas dos veces —
-- sin esto, un reintento de Meta podía duplicar un pedido si coincidía justo
-- con el mensaje de confirmación del cliente.
alter table public.whatsapp_messages add column wa_message_id text;
create unique index whatsapp_messages_wa_message_id_key on public.whatsapp_messages (wa_message_id) where wa_message_id is not null;
