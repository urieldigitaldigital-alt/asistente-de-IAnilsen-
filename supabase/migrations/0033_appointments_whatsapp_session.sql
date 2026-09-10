-- Vincula una cita con la conversación de WhatsApp que la generó (si vino de
-- ahí) — permite mostrar el nombre real del cliente y si es nuevo o no en el
-- listado de conversaciones, en vez de solo el número de teléfono.
alter table public.appointments
  add column if not exists whatsapp_session_id uuid references public.whatsapp_sessions (id) on delete set null;
