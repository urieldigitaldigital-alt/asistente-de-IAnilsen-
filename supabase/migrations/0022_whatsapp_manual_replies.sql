-- 0022_whatsapp_manual_replies.sql
-- Permite al dueño del negocio contestar manualmente desde el panel una
-- conversación de WhatsApp (además de las respuestas automáticas del
-- asistente). Se distingue con role = 'business' para poder mostrar en el
-- panel quién escribió cada mensaje saliente (el asistente o el dueño).

do $$
declare
  check_name text;
begin
  select con.conname into check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'whatsapp_messages' and con.contype = 'c' and att.attname = 'role';

  if check_name is not null then
    execute format('alter table public.whatsapp_messages drop constraint %I', check_name);
  end if;
end $$;

alter table public.whatsapp_messages
  add constraint whatsapp_messages_role_check check (role in ('customer', 'assistant', 'business'));

-- Solo se puede insertar como 'business' (las de 'customer'/'assistant' las
-- escribe el webhook con el cliente admin) y solo en conversaciones del
-- propio negocio.
create policy whatsapp_messages_insert_business on public.whatsapp_messages
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and role = 'business');
