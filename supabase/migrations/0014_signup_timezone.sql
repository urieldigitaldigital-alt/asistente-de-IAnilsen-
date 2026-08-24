-- 0014_signup_timezone.sql
-- handle_new_user() ahora toma la zona horaria elegida en el registro
-- (detectada automáticamente del navegador, editable) en vez de dejar
-- siempre el default de la columna ('America/Mexico_City'), que causaba
-- horarios incorrectos para negocios fuera de México.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clinic_name text;
  clinic_timezone text;
  base_slug text;
  candidate_slug text;
  suffix int := 0;
  new_clinic_id uuid;
begin
  clinic_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'clinic_name'), ''), 'Mi Negocio');
  clinic_timezone := coalesce(nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''), 'America/Mexico_City');

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

  insert into public.clinics (name, slug, timezone)
  values (clinic_name, candidate_slug, clinic_timezone)
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
    'Eres el asistente virtual de ' || clinic_name || '. Ayudas a los clientes a agendar, consultar y cancelar citas, y respondes dudas frecuentes sobre el negocio. Sé profesional, cálido y conciso. Confirma siempre la disponibilidad antes de reservar una cita, y repite en voz alta los datos capturados antes de finalizar.',
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
    'Gracias por llamar a ' || clinic_name || '. Soy el asistente virtual, ¿le gustaría agendar una cita?',
    'Un momento, le comunico con recepción.'
  );

  return new;
end;
$$;
