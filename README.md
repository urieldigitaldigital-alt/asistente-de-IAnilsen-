# Asistente Nilsen IA

SaaS multi-tenant que gestiona asistentes de IA por WhatsApp para cualquier negocio que necesite responder mensajes, agendar citas/reservas o tomar pedidos (clínicas, restaurantes, inmobiliarias, servicios, etc.): responden automáticamente, agendan/consultan/cancelan citas en Google Calendar, hacen seguimiento automático a quien no contesta y marcan el interés de cada lead. Cada negocio administra su propio asistente desde un panel web (Dashboard, Calendario, CRM, WhatsApp, Personalización, Integraciones).

## Stack

- Next.js 16 (App Router, Turbopack, `proxy.ts`) + React 19.2 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + Row Level Security + pg_cron/pg_net)
- Claude (Anthropic SDK) para el asistente de WhatsApp
- Meta WhatsApp Cloud API (Embedded Signup de un clic, o conexión manual)
- Google Calendar API vía OAuth 2.0 (`googleapis`)
- pnpm

## 1. Requisitos

- Node.js ≥ 20.9
- pnpm (`corepack enable` si no lo tienes instalado globalmente)
- Un proyecto de [Supabase](https://supabase.com) con `pg_cron` y `pg_net` habilitados
- Una App de [Meta for Developers](https://developers.facebook.com) con el producto WhatsApp
- Un proyecto de [Google Cloud](https://console.cloud.google.com) con la Calendar API habilitada
- Una API key de [Anthropic](https://console.anthropic.com)

## 2. Instalación

```bash
pnpm install
cp .env.example .env.local
```

Completa `.env.local` con los valores de las secciones siguientes. **Nunca** pongas estas variables en `NEXT_PUBLIC_*` salvo las que ya lo son — `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `META_APP_SECRET`, `GOOGLE_CLIENT_SECRET` y `ENCRYPTION_KEY` son secretos de servidor.

Genera `ENCRYPTION_KEY` (32 bytes para AES-256-GCM):

```bash
openssl rand -hex 32
```

## 3. Supabase

1. Crea un proyecto en Supabase y copia `Project URL`, `anon key` y `service_role key` a `.env.local`.
2. Corre las migraciones de `supabase/migrations/` en orden (pégalas en el **SQL Editor** del dashboard, un archivo a la vez).
3. Habilita las extensiones `pg_cron` y `pg_net` (Database → Extensions), y programá los dos cron jobs documentados como comentario en `0032_whatsapp_pending_reply.sql` (respuestas demoradas, cada 1 minuto) y `0036_whatsapp_only.sql` (seguimientos automáticos, cada 6 horas) — ambos llaman a una ruta interna con el header `x-cron-secret` (`WHATSAPP_CRON_SECRET`).
4. El trigger `on_auth_user_created` crea automáticamente el negocio, el perfil (`role='owner'`) y una configuración de agente genérica por defecto cuando alguien se registra.

## 4. Meta (WhatsApp)

Hay dos formas de conectar WhatsApp, y conviven: un botón de un clic (recomendado) y un formulario manual de respaldo.

### 4.1 Botón de un clic (Embedded Signup)

1. Verificá tu negocio en Meta Business Manager y registrate como Meta Developer.
2. Creá una App tipo **Business** en [developers.facebook.com](https://developers.facebook.com) → copiá el **App ID** y el **App Secret** a `META_APP_ID`/`NEXT_PUBLIC_META_APP_ID` y `META_APP_SECRET`.
3. Agregale los productos **WhatsApp** y **Facebook Login for Business**.
4. Dentro de Facebook Login for Business → Configuraciones, creá una de tipo **Embedded Signup** con token **"Never expires"** → copiá el **Configuration ID** a `NEXT_PUBLIC_META_CONFIG_ID`.
5. En WhatsApp → Configuración → Webhooks: poné como Callback URL `{APP_URL}/api/whatsapp/webhook` y elegí un **Verify Token** cualquiera → ese mismo valor va en `META_WEBHOOK_VERIFY_TOKEN`. Suscribite al campo `messages`.
6. Con eso, cualquier negocio que entre al panel y toque "Conectar con Facebook" en Integraciones queda conectado sin copiar ni pegar nada — hasta que Meta termine la revisión de la App (Advanced Access), esto solo funciona para las cuentas con rol de administrador/tester en tu App.

### 4.2 Conexión manual (respaldo, por negocio)

Cada negocio puede conectar su propio número a mano desde **Integraciones**, pegando `whatsapp_number`, `meta_phone_number_id`, `meta_access_token` y un `meta_verify_token` propio — útil mientras la App no tiene Advanced Access, o para negocios que ya tenían un número configurado así.

## 5. Google Cloud (OAuth de Google Calendar)

1. En Google Cloud Console: habilita la **Google Calendar API**.
2. Crea credenciales OAuth 2.0 de tipo **Web application**.
3. Agrega como **Authorized redirect URI**: `{APP_URL}/api/google/callback` (en local: `http://localhost:3000/api/google/callback`).
4. Copia el `Client ID` y `Client secret` a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, y pon la misma URI en `GOOGLE_REDIRECT_URI`.
5. Desde el panel, cada negocio conecta su propio Google Calendar en **Integraciones > Conectar con Google**. Los tokens se guardan cifrados (AES-256-GCM) en `google_credentials`, asociados a `clinic_id`.

Scopes usados: `calendar.events` (crear/borrar citas) y `calendar.readonly` (leer eventos existentes para el pull-sync del Calendario).

## 6. Levantar en local

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Recibir webhooks de Meta en local

Meta necesita alcanzar tu webhook públicamente. Usa ngrok apuntando a tu servidor Next.js:

```bash
ngrok http 3000
# copiá la URL pública de ngrok y poné esa URL + /api/whatsapp/webhook como
# Callback URL en Meta → WhatsApp → Configuración → Webhooks.
```

## 7. Notas de seguridad

- `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) solo se usa en los webhooks/crons de WhatsApp y en el flujo de Google OAuth — nunca en código de cliente ni en las vistas normales, que leen con la sesión del usuario y por tanto quedan aisladas por negocio vía RLS.
- Los tokens de Google y las credenciales de WhatsApp se cifran con AES-256-GCM (`lib/crypto.ts`) antes de guardarse.
- `.env.local` nunca se commitea (`.gitignore` excluye `.env*`, con excepción explícita de `.env.example`).

## Estructura relevante

```
supabase/migrations/          Esquema SQL + RLS + trigger de registro
src/proxy.ts                  Protección de rutas (reemplaza a middleware.ts en Next 16)
src/lib/assistant/             Prompt builder, tools, handlers — lógica del asistente, compartida
src/lib/whatsapp/              Cliente de Meta, chat con Claude, seguimientos automáticos
src/lib/google/                OAuth + Google Calendar API
src/app/api/whatsapp/          Webhook de Meta, cron de respuestas demoradas y de seguimientos
src/app/api/meta/              Intercambio del Embedded Signup (login con Facebook)
src/app/api/google/            OAuth callback de Google
src/app/(app)/                 Dashboard, Calendario, CRM, WhatsApp, Personalización, Integraciones
```
