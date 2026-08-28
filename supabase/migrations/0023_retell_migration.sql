-- 0023_retell_migration.sql
-- Reemplaza VAPI por Retell AI como único proveedor de voz de la plataforma
-- (decisión explícita: no es un proveedor alternativo, VAPI se da de baja).
-- También agrega las columnas de idempotencia para las llamadas salientes
-- automáticas (pedido listo / recordatorio de cita-visita).

-- Cada negocio conectaba su propia cuenta de VAPI; ahora conecta su propia
-- cuenta de Retell, mismo esquema y mismas políticas.
drop table if exists public.vapi_credentials;

create table public.retell_credentials (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  api_key_encrypted text not null,
  updated_at timestamptz not null default now()
);

alter table public.retell_credentials enable row level security;
alter table public.retell_credentials force row level security;

create trigger retell_credentials_set_updated_at
  before update on public.retell_credentials
  for each row execute function public.set_updated_at();

create policy retell_credentials_select on public.retell_credentials
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy retell_credentials_insert on public.retell_credentials
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy retell_credentials_update on public.retell_credentials
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy retell_credentials_delete on public.retell_credentials
  for delete to authenticated
  using (clinic_id = public.current_clinic_id());

-- No se renombra: un UUID de assistant/número de VAPI no es válido como ID de
-- Retell, así que se pisan con columnas nuevas en vez de arrastrar el valor viejo.
alter table public.agent_configs
  drop column vapi_assistant_id,
  drop column vapi_phone_number_id,
  add column retell_agent_id text,
  add column retell_llm_id text,
  -- Retell identifica los números por el string E.164 literal, no un UUID
  -- opaco (ver hallazgo de la investigación de su API) — este mismo valor
  -- sirve para rutear el webhook de "call_inbound".
  add column retell_phone_number text,
  -- Agente y LLM separados, dedicados a las llamadas salientes automáticas
  -- (pedido listo / recordatorio), para no tocar el flujo conversacional
  -- de las llamadas entrantes.
  add column retell_outbound_agent_id text,
  add column retell_outbound_llm_id text;

-- Nullable (no "not null"): las llamadas ya registradas con VAPI se quedan
-- sin retell_call_id, y eso es correcto — son historial de un proveedor que
-- ya no se usa. Las filas nuevas del webhook de Retell siempre lo completan.
alter table public.calls
  drop column vapi_call_id,
  add column retell_call_id text;

-- unique permite múltiples NULL (no rompe con las filas viejas de VAPI).
alter table public.calls
  add constraint calls_retell_call_id_key unique (retell_call_id);

-- Idempotencia de llamadas salientes automáticas: evita llamar dos veces por
-- el mismo pedido/cita/visita si el disparador se ejecuta más de una vez.
alter table public.orders add column order_ready_called_at timestamptz;
alter table public.appointments add column reminder_called_at timestamptz;
alter table public.property_visits add column reminder_called_at timestamptz;
