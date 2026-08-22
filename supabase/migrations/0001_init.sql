-- 0001_init.sql
-- Esquema base multi-tenant (clínica = tenant) con Row Level Security.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Mexico_City',
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create index profiles_clinic_id_idx on public.profiles (clinic_id);

create table public.agent_configs (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  system_prompt text not null default '',
  tone text not null default 'profesional y cálido',
  clinic_info jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  business_hours jsonb not null default '{}'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  language text not null default 'es',
  model jsonb not null default '{}'::jsonb,
  first_message text not null default '',
  handoff_message text,
  vapi_assistant_id text,
  vapi_phone_number_id text,
  updated_at timestamptz not null default now()
);

create table public.google_credentials (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  scope text not null,
  calendar_id text not null default 'primary',
  updated_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  vapi_call_id text not null unique,
  started_at timestamptz,
  ended_at timestamptz,
  phone_number text,
  status text,
  summary text,
  cost numeric,
  recording_url text,
  created_at timestamptz not null default now()
);

create index calls_clinic_id_idx on public.calls (clinic_id);
create index calls_clinic_id_started_at_idx on public.calls (clinic_id, started_at desc);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  google_event_id text,
  google_event_link text,
  patient_name text not null,
  patient_phone text not null,
  patient_email text,
  treatment text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_new_patient boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create index appointments_clinic_id_idx on public.appointments (clinic_id);
create index appointments_clinic_id_start_time_idx on public.appointments (clinic_id, start_time);

-- Evita agendar dos citas activas en el mismo hueco exacto para la misma clínica (idempotencia).
create unique index appointments_clinic_start_unique_active
  on public.appointments (clinic_id, start_time)
  where status = 'scheduled';

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  call_id uuid not null references public.calls (id) on delete cascade,
  role text check (role in ('assistant', 'user')),
  text text,
  "timestamp" timestamptz,
  full_transcript text,
  created_at timestamptz not null default now()
);

create index transcripts_clinic_id_idx on public.transcripts (clinic_id);
create index transcripts_call_id_idx on public.transcripts (call_id);

-- ---------------------------------------------------------------------------
-- Helper multi-tenant
-- ---------------------------------------------------------------------------

-- Devuelve el clinic_id del usuario autenticado. security definer porque
-- profiles tiene su propia RLS (solo la fila propia es visible); esta función
-- solo expone el clinic_id del propio caller (auth.uid()), nunca datos ajenos.
create function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

grant execute on function public.current_clinic_id() to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agent_configs_set_updated_at
  before update on public.agent_configs
  for each row execute function public.set_updated_at();

create trigger google_credentials_set_updated_at
  before update on public.google_credentials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.clinics enable row level security;
alter table public.clinics force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.agent_configs enable row level security;
alter table public.agent_configs force row level security;
alter table public.google_credentials enable row level security;
alter table public.google_credentials force row level security;
alter table public.calls enable row level security;
alter table public.calls force row level security;
alter table public.appointments enable row level security;
alter table public.appointments force row level security;
alter table public.transcripts enable row level security;
alter table public.transcripts force row level security;

-- clinics: visible/editable solo para miembros de la propia clínica.
create policy clinics_select on public.clinics
  for select to authenticated
  using (id = public.current_clinic_id());

create policy clinics_update on public.clinics
  for update to authenticated
  using (id = public.current_clinic_id())
  with check (id = public.current_clinic_id());

-- profiles: cada usuario ve/edita solo su propia fila.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- agent_configs
create policy agent_configs_select on public.agent_configs
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy agent_configs_insert on public.agent_configs
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy agent_configs_update on public.agent_configs
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

-- google_credentials
create policy google_credentials_select on public.google_credentials
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy google_credentials_delete on public.google_credentials
  for delete to authenticated
  using (clinic_id = public.current_clinic_id());

-- calls (solo lectura desde el panel; las escrituras las hace el webhook con la service role, que bypassa RLS)
create policy calls_select on public.calls
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

-- appointments (lectura desde el panel; cancelación manual permitida)
create policy appointments_select on public.appointments
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy appointments_update on public.appointments
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

-- transcripts (solo lectura desde el panel)
create policy transcripts_select on public.transcripts
  for select to authenticated
  using (clinic_id = public.current_clinic_id());
