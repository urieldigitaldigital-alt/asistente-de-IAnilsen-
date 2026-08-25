-- 0015_order_number.sql
-- Agrega un número de pedido secuencial por negocio (1, 2, 3... por
-- clinic_id, nunca se repite ni salta) para identificar pedidos al hablar
-- con el cliente, en el tablero de Pedidos y en el ticket impreso.

create table public.clinic_order_counters (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  next_number integer not null default 1
);

alter table public.clinic_order_counters enable row level security;
alter table public.clinic_order_counters force row level security;
-- Sin políticas: solo la usa la función de abajo (security definer) al
-- insertar un pedido; no hace falta exponerla al panel.

alter table public.orders
  add column order_number integer not null default 0;

-- Backfill: numera los pedidos que ya existían antes de esta migración
-- (por orden de llegada), para que el índice único de abajo no choque.
with numbered as (
  select id, row_number() over (partition by clinic_id order by created_at) as rn
  from public.orders
)
update public.orders o
set order_number = numbered.rn
from numbered
where o.id = numbered.id;

-- Deja el contador de cada clínica listo para el próximo pedido nuevo.
insert into public.clinic_order_counters (clinic_id, next_number)
select clinic_id, max(order_number) + 1
from public.orders
group by clinic_id
on conflict (clinic_id) do update set next_number = excluded.next_number;

create unique index orders_clinic_id_order_number_key on public.orders (clinic_id, order_number);

create function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num integer;
begin
  insert into public.clinic_order_counters (clinic_id, next_number)
  values (new.clinic_id, 2)
  on conflict (clinic_id) do update set next_number = clinic_order_counters.next_number + 1
  returning next_number - 1 into next_num;

  new.order_number := next_num;
  return new;
end;
$$;

create trigger orders_assign_order_number
  before insert on public.orders
  for each row execute function public.assign_order_number();
