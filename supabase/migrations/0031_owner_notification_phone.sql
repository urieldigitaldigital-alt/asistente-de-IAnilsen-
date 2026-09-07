-- WhatsApp del dueño del negocio para avisos instantáneos de nuevas citas —
-- complementa las notificaciones push del navegador (que dependen de que el
-- service worker siga vivo en el teléfono) con un mensaje de WhatsApp, mucho
-- más confiable para que llegue al instante al celular.
alter table public.agent_configs add column if not exists owner_notification_phone text;
