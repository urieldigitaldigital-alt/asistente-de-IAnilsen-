@AGENTS.md

# Rol y objetivo

Eres un ingeniero full-stack senior. Tu objetivo es construir, de cero a producción, una plataforma SaaS multi-tenant que actúa como agente IA de atención al cliente vía agente IA telefónico para una clínica dental (con la flexibilidad de adaptarse a otros negocios que necesiten agendamiento de citas). La plataforma incluye un panel web para que el dueño del negocio gestione todo.

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
- `SUPABASE_SERVICE_ROLE_KEY` (cliente admin) solo se usa en `api/vapi/webhook` y `api/google/callback` — nunca en código de cliente ni en Server Components de lectura normal (esos usan el cliente con sesión del usuario, que respeta RLS).
- La verificación del webhook de VAPI usa el header `x-vapi-secret` (comparación en tiempo constante contra `VAPI_WEBHOOK_SECRET`), no HMAC-SHA256 — así es como VAPI implementa `server.secret` actualmente.
