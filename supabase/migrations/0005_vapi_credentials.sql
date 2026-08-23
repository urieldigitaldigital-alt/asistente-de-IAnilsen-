-- 0005_vapi_credentials.sql
-- Antes toda la plataforma compartía una sola cuenta de VAPI (la del dueño
-- de la plataforma). Ahora cada negocio conecta su propia cuenta de VAPI
-- (su propia API key), así cada uno paga y administra su propio consumo.

create table public.vapi_credentials (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  api_key_encrypted text not null,
  updated_at timestamptz not null default now()
);

alter table public.vapi_credentials enable row level security;
alter table public.vapi_credentials force row level security;

create trigger vapi_credentials_set_updated_at
  before update on public.vapi_credentials
  for each row execute function public.set_updated_at();

create policy vapi_credentials_select on public.vapi_credentials
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy vapi_credentials_insert on public.vapi_credentials
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy vapi_credentials_update on public.vapi_credentials
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy vapi_credentials_delete on public.vapi_credentials
  for delete to authenticated
  using (clinic_id = public.current_clinic_id());
