-- Clientes cerrados por el asistente (venta confirmada, no solo una cita
-- agendada) — opt-in por negocio vía agent_configs.sales_closing_enabled,
-- para no forzar este flujo de "cerrar venta" a rubros donde no aplica
-- (ej. una clínica dental no "cierra" pacientes).
create table public.closed_clients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  whatsapp_session_id uuid references public.whatsapp_sessions (id) on delete set null,
  client_name text not null,
  client_phone text not null,
  service text not null,
  notes text,
  status text not null default 'nuevo' check (status in ('nuevo', 'en_onboarding', 'activo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.closed_clients enable row level security;
alter table public.closed_clients force row level security;

create policy closed_clients_select on public.closed_clients
  for select to authenticated using (clinic_id = public.current_clinic_id());
create policy closed_clients_update on public.closed_clients
  for update to authenticated using (clinic_id = public.current_clinic_id());
-- Sin policy de insert/delete para "authenticated": los crea el webhook con
-- la service role (bypassa RLS), igual que appointments/orders.

alter table public.agent_configs add column if not exists sales_closing_enabled boolean not null default false;
