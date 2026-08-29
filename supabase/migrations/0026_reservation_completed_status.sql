-- 0026_reservation_completed_status.sql
-- Agrega el estado "completada" a table_reservations: para liberar una mesa
-- marcando que el cliente ya se fue/pagó, sin perder el registro de la
-- reserva (a diferencia de "cancelada", que implica que nunca se concretó).
do $$
declare
  check_name text;
begin
  select con.conname into check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'table_reservations' and con.contype = 'c' and att.attname = 'status';

  if check_name is not null then
    execute format('alter table public.table_reservations drop constraint %I', check_name);
  end if;
end $$;

alter table public.table_reservations
  add constraint table_reservations_status_check
  check (status in ('pendiente', 'asignada', 'cancelada', 'completada'));
