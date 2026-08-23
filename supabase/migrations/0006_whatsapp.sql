-- 0006_whatsapp.sql
-- Integración de WhatsApp por negocio, vía Twilio (número WhatsApp propio
-- de cada negocio) + la Chat API de VAPI (reutiliza el mismo assistant,
-- prompt y tools que ya usa el negocio para llamadas).

create table public.whatsapp_credentials (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  twilio_account_sid text not null,
  twilio_auth_token_encrypted text not null,
  -- Número de WhatsApp del negocio en formato E.164, sin el prefijo "whatsapp:".
  whatsapp_number text not null,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_credentials enable row level security;
alter table public.whatsapp_credentials force row level security;

create trigger whatsapp_credentials_set_updated_at
  before update on public.whatsapp_credentials
  for each row execute function public.set_updated_at();

create policy whatsapp_credentials_select on public.whatsapp_credentials
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy whatsapp_credentials_insert on public.whatsapp_credentials
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy whatsapp_credentials_update on public.whatsapp_credentials
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy whatsapp_credentials_delete on public.whatsapp_credentials
  for delete to authenticated
  using (clinic_id = public.current_clinic_id());

-- Un número de WhatsApp de negocio no puede estar vinculado a dos negocios a la vez.
create unique index whatsapp_credentials_number_unique on public.whatsapp_credentials (whatsapp_number);

-- Mapea cada conversación (negocio + número de cliente) a una sesión de la
-- Chat API de VAPI, para que el bot recuerde el contexto entre mensajes.
-- Los escribe únicamente el webhook (cliente admin), por eso solo hay
-- política de lectura para el dueño del negocio.
create table public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  customer_phone text not null,
  vapi_session_id text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (clinic_id, customer_phone)
);

alter table public.whatsapp_sessions enable row level security;
alter table public.whatsapp_sessions force row level security;

create policy whatsapp_sessions_select on public.whatsapp_sessions
  for select to authenticated
  using (clinic_id = public.current_clinic_id());
