-- 0024_revert_to_vapi.sql
-- Revierte 0023_retell_migration.sql: el número de Argentina (DIDWW) quedó
-- pendiente de activación en el proveedor, sin relación con VAPI ni Retell,
-- pero el negocio prefiere volver a VAPI de todos modos.
drop table if exists public.retell_credentials;

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
  for select to authenticated using (clinic_id = public.current_clinic_id());
create policy vapi_credentials_insert on public.vapi_credentials
  for insert to authenticated with check (clinic_id = public.current_clinic_id());
create policy vapi_credentials_update on public.vapi_credentials
  for update to authenticated using (clinic_id = public.current_clinic_id()) with check (clinic_id = public.current_clinic_id());
create policy vapi_credentials_delete on public.vapi_credentials
  for delete to authenticated using (clinic_id = public.current_clinic_id());

alter table public.agent_configs
  drop column retell_agent_id,
  drop column retell_llm_id,
  drop column retell_phone_number,
  drop column retell_outbound_agent_id,
  drop column retell_outbound_llm_id,
  add column vapi_assistant_id text,
  add column vapi_phone_number_id text;

-- vapi_call_id era "not null unique" en el esquema original, pero los
-- vapi_call_id de las 43 llamadas históricas ya se perdieron para siempre
-- cuando 0023 hizo "drop column" — no hay forma de recuperarlos, así que
-- queda nullable (los webhooks nuevos siempre la completan igual).
alter table public.calls
  drop column retell_call_id,
  add column vapi_call_id text unique;

alter table public.orders drop column if exists order_ready_called_at;
alter table public.appointments drop column if exists reminder_called_at;
alter table public.property_visits drop column if exists reminder_called_at;
