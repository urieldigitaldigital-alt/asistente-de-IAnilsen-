-- 0028_calls_direction.sql
-- Distingue llamadas entrantes de salientes (hasta ahora todas eran
-- entrantes, ya que las salientes automáticas están bloqueadas/sin usar) —
-- necesario para el panel de CRM.
alter table public.calls add column direction text not null default 'inbound' check (direction in ('inbound', 'outbound'));
