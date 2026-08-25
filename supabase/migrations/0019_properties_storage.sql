-- 0019_properties_storage.sql
-- Bucket público para fotos de propiedades (Inmobiliaria). Solo el dueño del
-- negocio (autenticado) puede subir/editar/borrar, y solo dentro de su
-- propia carpeta ({clinic_id}/...); la lectura es pública porque son fotos
-- de una publicación inmobiliaria, no datos sensibles.

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

create policy property_photos_public_read
  on storage.objects for select
  using (bucket_id = 'property-photos');

create policy property_photos_authenticated_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (public.current_clinic_id())::text
  );

create policy property_photos_authenticated_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (public.current_clinic_id())::text
  );

create policy property_photos_authenticated_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (public.current_clinic_id())::text
  );
