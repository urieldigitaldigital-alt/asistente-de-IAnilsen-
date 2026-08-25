-- 0016_business_types.sql
-- Amplía business_type de 2 a 5 rubros: además de "citas" y "pedidos", ahora
-- "restaurante" (mesas + carta), "inmobiliaria" (propiedades + visitas) y
-- "llamadas" (solo toma consultas, sin agendar nada).

do $$
declare
  check_name text;
begin
  select con.conname into check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'clinics' and con.contype = 'c' and att.attname = 'business_type';

  if check_name is not null then
    execute format('alter table public.clinics drop constraint %I', check_name);
  end if;
end $$;

alter table public.clinics
  add constraint clinics_business_type_check
  check (business_type in ('citas', 'pedidos', 'restaurante', 'inmobiliaria', 'llamadas'));
