-- 0003_google_credentials_write_policies.sql
-- 0001_init.sql solo agregó políticas de SELECT y DELETE para google_credentials,
-- por lo que el upsert de tokens en el callback de OAuth (que corre con la sesión
-- del usuario, no con la service role) siempre fallaba con "new row violates
-- row-level security policy". Agrega las políticas de INSERT y UPDATE que faltaban.

create policy google_credentials_insert on public.google_credentials
  for insert to authenticated
  with check (clinic_id = public.current_clinic_id());

create policy google_credentials_update on public.google_credentials
  for update to authenticated
  using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
