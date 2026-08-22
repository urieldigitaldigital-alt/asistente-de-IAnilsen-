# Asistente Dental IA

SaaS multi-tenant que gestiona agentes de voz IA (VAPI) para clínicas dentales: atienden llamadas telefónicas, agendan/consultan/cancelan citas en Google Calendar y guardan la transcripción de cada llamada. Cada clínica administra su propio agente desde un panel web (Dashboard, Calendario, Transcripciones, Personalización, Integraciones).

## Stack

- Next.js 16 (App Router, Turbopack, `proxy.ts`) + React 19.2 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + Row Level Security)
- VAPI (`@vapi-ai/server-sdk`) para el agente de voz
- Google Calendar API vía OAuth 2.0 (`googleapis`)
- pnpm

## 1. Requisitos

- Node.js ≥ 20.9
- pnpm (`corepack enable` si no lo tienes instalado globalmente)
- Un proyecto de [Supabase](https://supabase.com)
- Una cuenta de [VAPI](https://vapi.ai) con un método de pago para comprar/crear un número
- Un proyecto de [Google Cloud](https://console.cloud.google.com) con la Calendar API habilitada

## 2. Instalación

```bash
pnpm install
cp .env.example .env.local
```

Completa `.env.local` con los valores de las secciones siguientes. **Nunca** pongas estas variables en `NEXT_PUBLIC_*` salvo las que ya lo son — `SUPABASE_SERVICE_ROLE_KEY`, `VAPI_API_KEY`, `GOOGLE_CLIENT_SECRET` y `ENCRYPTION_KEY` son secretos de servidor.

Genera `ENCRYPTION_KEY` (32 bytes para AES-256-GCM):

```bash
openssl rand -hex 32
```

## 3. Supabase

1. Crea un proyecto en Supabase y copia `Project URL`, `anon key` y `service_role key` a `.env.local`.
2. Corre las migraciones en `supabase/migrations/` en orden (`0001_init.sql`, luego `0002_handle_new_user.sql`), por ejemplo:
   ```bash
   supabase link --project-ref <tu-project-ref>
   supabase db push
   ```
   o pégalas directamente en el **SQL Editor** del dashboard, en ese orden.
3. Verifica que RLS quedó activo en las 7 tablas (`clinics`, `profiles`, `agent_configs`, `google_credentials`, `calls`, `appointments`, `transcripts`) — las migraciones ya lo hacen con `enable row level security` + `force row level security`.
4. El trigger `on_auth_user_created` crea automáticamente la clínica, el perfil (`role='owner'`) y una configuración de agente por defecto cuando alguien se registra.

## 4. VAPI

1. Crea una API key en el dashboard de VAPI (`Settings > API Keys`) y ponla en `VAPI_API_KEY`.
2. Define `VAPI_WEBHOOK_SECRET` con cualquier string aleatorio largo — la app lo manda como header `x-webhook-secret` en `assistant.server.headers` y lo valida en `POST /api/vapi/webhook` (comparación en tiempo constante). No es HMAC ni el header `x-vapi-signature`: es el mecanismo actual soportado por el schema de `server` de VAPI.
3. Levanta la app, inicia sesión y ve a **Personalización > Publicar**. Esto crea (o actualiza) el assistant vía `POST/PATCH /assistant` con el `system_prompt` compuesto, la voz, el transcriber, las tools y `server.url = {APP_URL}/api/vapi/webhook`.
4. Crea un número en el dashboard de VAPI (`Phone Numbers`) para esa clínica y copia su **UUID** (no el `+52...`).
5. Ve a **Integraciones**, pega el UUID en "Asistente y número de VAPI" y da clic en **Vincular**. Esto hace `PATCH /phone-number/{id} { assistantId }` para que las llamadas entrantes lleguen al asistente.

## 5. Google Cloud (OAuth de Google Calendar)

1. En Google Cloud Console: habilita la **Google Calendar API**.
2. Crea credenciales OAuth 2.0 de tipo **Web application**.
3. Agrega como **Authorized redirect URI**: `{APP_URL}/api/google/callback` (en local: `http://localhost:3000/api/google/callback`).
4. Copia el `Client ID` y `Client secret` a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, y pon la misma URI en `GOOGLE_REDIRECT_URI`.
5. Desde el panel, cada clínica conecta su propio Google Calendar en **Integraciones > Conectar con Google**. Los tokens se guardan cifrados (AES-256-GCM) en `google_credentials`, asociados a `clinic_id`.

Scopes usados: `calendar.events` (crear/borrar citas) y `calendar.readonly` (leer eventos existentes para el pull-sync del Calendario).

## 6. Levantar en local

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Recibir webhooks de VAPI en local

VAPI necesita alcanzar tu `server.url` públicamente. Usa la CLI de VAPI + un túnel, o directamente ngrok apuntando a tu servidor Next.js:

```bash
# Opción simple: ngrok directo a Next.js
ngrok http 3000
# copia la URL pública de ngrok y ponla como APP_URL en .env.local (con /api/vapi/webhook agregado
# automáticamente por la app), luego vuelve a "Publicar" en Personalización para que VAPI apunte ahí.
```

```bash
# Alternativa: CLI de VAPI
curl -sSL https://vapi.ai/install.sh | bash
ngrok http 4242
vapi listen --forward-to localhost:3000/api/vapi/webhook
```

## 7. Notas de seguridad

- `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) solo se usa en `api/vapi/webhook` y en el flujo de Google OAuth — nunca en código de cliente ni en las vistas normales, que leen con la sesión del usuario y por tanto quedan aisladas por clínica vía RLS.
- Los tokens de Google se cifran con AES-256-GCM (`lib/crypto.ts`) antes de guardarse.
- `.env.local` nunca se commitea (`.gitignore` excluye `.env*`, con excepción explícita de `.env.example`).

## Estructura relevante

```
supabase/migrations/       Esquema SQL + RLS + trigger de registro
src/proxy.ts                Protección de rutas (reemplaza a middleware.ts en Next 16)
src/lib/vapi/                Cliente VAPI, prompt builder, tools, sync con la API
src/lib/google/              OAuth + Google Calendar API
src/app/api/vapi/webhook/    Webhook de VAPI (tool-calls, end-of-call-report)
src/app/api/google/          OAuth callback de Google
src/app/(app)/                Dashboard, Calendario, Transcripciones, Personalización, Integraciones
```
