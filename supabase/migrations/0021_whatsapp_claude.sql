-- 0021_whatsapp_claude.sql
-- WhatsApp deja de depender del Chat de VAPI (pedía tarjeta cargada en la
-- cuenta de VAPI de cada negocio) — ahora responde con la API de Claude
-- directamente, usando una sola clave de Anthropic de la plataforma.

alter table public.whatsapp_sessions
  drop column vapi_session_id;
