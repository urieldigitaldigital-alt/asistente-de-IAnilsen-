-- Tope opcional de citas/reuniones agendadas por día (NULL = sin límite).
-- Usado por handleBookAppointment/handleCheckAvailability para no ofrecer ni
-- aceptar más de N citas en el mismo día calendario del negocio.
alter table public.agent_configs add column max_appointments_per_day integer;
