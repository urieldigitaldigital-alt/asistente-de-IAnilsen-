-- 0007_whatsapp_crm.sql
-- Convierte whatsapp_sessions en "conversaciones" con estado de seguimiento,
-- y agrega el historial de mensajes — la base de un mini-CRM de WhatsApp con
-- actualización en tiempo real (Supabase Realtime).

alter table public.whatsapp_sessions
  add column status text not null default 'active' check (status in ('active', 'needs_follow_up', 'resolved')),
  add column last_message_at timestamptz not null default now(),
  add column customer_name text;

create policy whatsapp_sessions_update on public.whatsapp_sessions
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  session_id uuid not null references public.whatsapp_sessions (id) on delete cascade,
  role text not null check (role in ('customer', 'assistant')),
  body text not null,
  created_at timestamptz not null default now()
);

create index whatsapp_messages_session_idx on public.whatsapp_messages (session_id, created_at);

alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_messages force row level security;

create policy whatsapp_messages_select on public.whatsapp_messages
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

-- Habilita Realtime (los cambios llegan en vivo al panel sin recargar la página).
alter publication supabase_realtime add table public.whatsapp_messages;
alter publication supabase_realtime add table public.whatsapp_sessions;
