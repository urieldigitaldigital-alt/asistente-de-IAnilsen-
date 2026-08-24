-- 0013_pedidos.sql
-- Agrega un segundo tipo de negocio ("pedidos", ej. restaurantes) además de
-- "citas": carta editable (menu_items en agent_configs, igual que services) y
-- una tabla de pedidos con estados, con actualización en tiempo real.

alter table public.clinics
  add column business_type text not null default 'citas' check (business_type in ('citas', 'pedidos'));

alter table public.agent_configs
  add column menu_items jsonb not null default '[]'::jsonb;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  order_type text not null default 'pickup' check (order_type in ('pickup', 'delivery')),
  delivery_address text,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'recibido'
    check (status in ('recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_clinic_id_idx on public.orders (clinic_id);
create index orders_clinic_id_created_at_idx on public.orders (clinic_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.orders force row level security;

-- Lectura para el panel; las escrituras de pedidos nuevos las hace el webhook
-- con la service role (bypassa RLS), igual que appointments/calls.
create policy orders_select on public.orders
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

-- Permite cambiar el estado del pedido (Recibido -> En preparación -> Listo -> Entregado) desde el panel.
create policy orders_update on public.orders
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

alter publication supabase_realtime add table public.orders;
