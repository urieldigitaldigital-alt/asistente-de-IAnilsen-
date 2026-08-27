-- 0020_order_controls.sql
-- Controles operativos para Pedidos/Restaurante: pausar pedidos por teléfono
-- (solo consultas) y modo "solo retiro" (sin envíos) — interruptores
-- manuales que el dueño prende/apaga durante el turno.

alter table public.agent_configs
  add column orders_paused boolean not null default false,
  add column pickup_only boolean not null default false;
