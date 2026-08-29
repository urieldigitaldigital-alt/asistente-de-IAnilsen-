-- 0025_table_occupied.sql
-- Estado manual de "ocupada" para el plano de mesas (independiente de si
-- tiene una reserva asignada) — para marcar mesas ocupadas por clientes que
-- llegaron sin reservar.
alter table public.restaurant_tables add column is_occupied boolean not null default false;
