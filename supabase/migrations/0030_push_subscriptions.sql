-- Suscripciones de notificaciones push del navegador (panel de CRM) — un
-- negocio puede tener más de un dispositivo/navegador suscripto.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;

create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (clinic_id = public.current_clinic_id());
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated with check (clinic_id = public.current_clinic_id());
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (clinic_id = public.current_clinic_id());
