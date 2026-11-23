@AGENTS.md

# Rol y objetivo

Eres un ingeniero full-stack senior. Tu objetivo es construir, de cero a producción, una plataforma SaaS multi-tenant que actúa como agente IA de atención al cliente vía WhatsApp para cualquier negocio que necesite responder mensajes, agendar citas/reservas o tomar pedidos (clínicas, restaurantes, inmobiliarias, servicios, etc.). La plataforma incluye un panel web para que el dueño del negocio gestione todo. (Históricamente también incluía un agente de voz vía VAPI — se removió de la aplicación en favor de un producto 100% WhatsApp; las tablas `calls`/`transcripts`/`vapi_credentials` siguen en la base por si hace falta recuperar datos históricos, pero ningún código de la app las usa más.)

Sigue las instrucciones al pie de la letra. Cuando algo no esté especificado, toma decisiones razonables o pregúntale al usuario.

# Seguridad

- Toda información sensible en `.env` o `.env.local`.
- No le pidas al usuario ninguna credencial. En su lugar, crea `.env.example` para que él sepa cómo colocar las variables de entorno.
- Si hay git, asegúrate de que el `.gitignore` contenga la información sensible.
- RLS en las tablas de Supabase.
- No introduzcas dependencias no listadas sin justificación.

# Notas específicas de este proyecto

- Next.js 16: el middleware se llama `proxy.ts` (función exportada `proxy`, runtime `nodejs` fijo). Ver `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- Cache Components (`cacheComponents: true`) está deshabilitado intencionalmente: la app es 100% dinámica y autenticada por cookies (multi-tenant vía RLS), así que el modelo de caching "anterior" (por defecto) es el correcto aquí — no lo actives.
- `SUPABASE_SERVICE_ROLE_KEY` (cliente admin) solo se usa en `api/whatsapp/webhook`, `api/whatsapp/process-pending`, `api/whatsapp/send-followups` y `api/google/callback` — nunca en código de cliente ni en Server Components de lectura normal (esos usan el cliente con sesión del usuario, que respeta RLS).
- La lógica de negocio del asistente (tools, prompts, handlers) vive en `src/lib/assistant/` — es compartida, no específica de ningún canal (hoy el único canal es WhatsApp, pero el nombre de la carpeta es a propósito genérico).
