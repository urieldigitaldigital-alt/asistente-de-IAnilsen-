-- 0017_signup_business_type.sql
-- El registro ahora pide el rubro del negocio (citas, pedidos, restaurante,
-- inmobiliaria, llamadas) y handle_new_user() lo guarda. También deja
-- system_prompt/first_message vacíos en vez de un texto fijo de "citas" —
-- así el default dinámico por rubro (promptBuilder.ts) siempre aplica limpio,
-- sin importar qué rubro elija el negocio (evita el bug de texto de citas
-- pegado en negocios de pedidos/restaurante/etc.).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clinic_name text;
  clinic_timezone text;
  clinic_business_type text;
  base_slug text;
  candidate_slug text;
  suffix int := 0;
  new_clinic_id uuid;
begin
  clinic_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'clinic_name'), ''), 'Mi Negocio');
  clinic_timezone := coalesce(nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''), 'America/Mexico_City');
  clinic_business_type := coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_type'), ''), 'citas');
  if clinic_business_type not in ('citas', 'pedidos', 'restaurante', 'inmobiliaria', 'llamadas') then
    clinic_business_type := 'citas';
  end if;

  base_slug := lower(regexp_replace(clinic_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'negocio';
  end if;

  candidate_slug := base_slug;
  while exists (select 1 from public.clinics where slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.clinics (name, slug, timezone, business_type)
  values (clinic_name, candidate_slug, clinic_timezone, clinic_business_type)
  returning id into new_clinic_id;

  insert into public.profiles (id, clinic_id, full_name, role)
  values (
    new.id,
    new_clinic_id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'owner'
  );

  insert into public.agent_configs (
    clinic_id,
    system_prompt,
    tone,
    clinic_info,
    services,
    business_hours,
    voice,
    language,
    model,
    first_message,
    handoff_message
  )
  values (
    new_clinic_id,
    '',
    'profesional y cálido',
    jsonb_build_object(
      'policies', '',
      'paymentMethods', jsonb_build_array('efectivo', 'tarjeta')
    ),
    jsonb_build_array(
      jsonb_build_object('name', 'Consulta general', 'duration_minutes', 30, 'description', 'Servicio o consulta estándar')
    ),
    jsonb_build_object(
      'monday', jsonb_build_object('start', '09:00', 'end', '18:00'),
      'tuesday', jsonb_build_object('start', '09:00', 'end', '18:00'),
      'wednesday', jsonb_build_object('start', '09:00', 'end', '18:00'),
      'thursday', jsonb_build_object('start', '09:00', 'end', '18:00'),
      'friday', jsonb_build_object('start', '09:00', 'end', '18:00'),
      'saturday', null,
      'sunday', null
    ),
    jsonb_build_object('provider', 'azure', 'voiceId', 'es-MX-DaliaNeural'),
    'es',
    jsonb_build_object('provider', 'openai', 'model', 'gpt-4.1'),
    '',
    'Un momento, le comunico con recepción.'
  );

  return new;
end;
$$;
