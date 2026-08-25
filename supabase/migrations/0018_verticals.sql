-- 0018_verticals.sql
-- Datos para los 3 rubros nuevos: Restaurante (mesas + reservas),
-- Inmobiliaria (propiedades + visitas) y Llamadas (consultas anotadas).

-- ---------------------------------------------------------------------------
-- Restaurante: mesas y reservas
-- ---------------------------------------------------------------------------

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  table_number integer not null,
  seats integer not null default 2,
  pos_x numeric not null default 0,
  pos_y numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (clinic_id, table_number)
);

create index restaurant_tables_clinic_id_idx on public.restaurant_tables (clinic_id);

alter table public.restaurant_tables enable row level security;
alter table public.restaurant_tables force row level security;

create policy restaurant_tables_select on public.restaurant_tables
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy restaurant_tables_insert on public.restaurant_tables
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy restaurant_tables_update on public.restaurant_tables
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy restaurant_tables_delete on public.restaurant_tables
  for delete to authenticated
  using (clinic_id = public.current_clinic_id());

create table public.table_reservations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  table_id uuid references public.restaurant_tables (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  party_size integer not null,
  reservation_time timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'asignada', 'cancelada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index table_reservations_clinic_id_idx on public.table_reservations (clinic_id);
create index table_reservations_clinic_id_reservation_time_idx on public.table_reservations (clinic_id, reservation_time);

create trigger table_reservations_set_updated_at
  before update on public.table_reservations
  for each row execute function public.set_updated_at();

alter table public.table_reservations enable row level security;
alter table public.table_reservations force row level security;

create policy table_reservations_select on public.table_reservations
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy table_reservations_update on public.table_reservations
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

alter publication supabase_realtime add table public.table_reservations;
alter publication supabase_realtime add table public.restaurant_tables;

-- ---------------------------------------------------------------------------
-- Inmobiliaria: propiedades y visitas
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  title text not null,
  address text not null,
  price numeric not null default 0,
  description text,
  photo_url text,
  status text not null default 'disponible' check (status in ('disponible', 'reservada', 'vendida')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_clinic_id_idx on public.properties (clinic_id);

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.properties force row level security;

create policy properties_select on public.properties
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy properties_insert on public.properties
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy properties_update on public.properties
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy properties_delete on public.properties
  for delete to authenticated
  using (clinic_id = public.current_clinic_id());

create table public.property_visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  visit_time timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'cancelada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_visits_clinic_id_idx on public.property_visits (clinic_id);

create trigger property_visits_set_updated_at
  before update on public.property_visits
  for each row execute function public.set_updated_at();

alter table public.property_visits enable row level security;
alter table public.property_visits force row level security;

create policy property_visits_select on public.property_visits
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy property_visits_update on public.property_visits
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

alter publication supabase_realtime add table public.property_visits;

-- ---------------------------------------------------------------------------
-- Llamadas: consultas anotadas
-- ---------------------------------------------------------------------------

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  call_id uuid references public.calls (id) on delete set null,
  customer_name text,
  customer_phone text not null,
  reason text not null,
  contacted boolean not null default false,
  created_at timestamptz not null default now()
);

create index inquiries_clinic_id_idx on public.inquiries (clinic_id);
create index inquiries_clinic_id_created_at_idx on public.inquiries (clinic_id, created_at desc);

alter table public.inquiries enable row level security;
alter table public.inquiries force row level security;

create policy inquiries_select on public.inquiries
  for select to authenticated
  using (clinic_id = public.current_clinic_id());

create policy inquiries_update on public.inquiries
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

alter publication supabase_realtime add table public.inquiries;
