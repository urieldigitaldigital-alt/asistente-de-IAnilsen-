import {
  CalendarBlankIcon,
  KeyIcon,
  ListNumbersIcon,
  PhoneIcon,
  RocketLaunchIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {number}
      </span>
      <div className="text-sm text-muted">
        <span className="font-medium text-foreground">{title}</span> {children}
      </div>
    </div>
  );
}

export function IntegrationsGuide() {
  const webhookUrl = `${(process.env.APP_URL || "").replace(/\/$/, "")}/api/whatsapp/webhook`;

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-2">
        <ListNumbersIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Guía paso a paso: cómo dejar todo funcionando</h2>
      </div>
      <p className="text-sm text-muted">
        Seguí estos 5 pasos en orden. No hace falta saber de tecnología — es solo copiar, pegar y hacer clic. Si te trabás en
        algún paso, mandá una captura de pantalla para que te ayuden.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyIcon size={16} className="text-primary" /> 1. Conectá tu cuenta de VAPI
        </div>
        <div className="space-y-2 pl-1">
          <Step number={1} title="Entrá a">
            {" "}
            <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              vapi.ai
            </a>{" "}
            y creá una cuenta gratis con tu correo (no te pide tarjeta para registrarte).
          </Step>
          <Step number={2} title="Adentro de VAPI, buscá en el menú">
            &quot;Settings&quot; y después &quot;API Keys&quot;.
          </Step>
          <Step number={3} title="Vas a ver una clave llamada">
            &quot;Private Key&quot; — copiala con el ícono al lado (o seleccionala y copiala como cualquier texto).
          </Step>
          <Step number={4} title="Volvé a esta página, pegala en la tarjeta">
            &quot;Tu cuenta de VAPI&quot; de más abajo, y tocá el botón &quot;Conectar&quot;.
          </Step>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <RocketLaunchIcon size={16} className="text-primary" /> 2. Publicá tu asistente
        </div>
        <div className="space-y-2 pl-1">
          <Step number={1} title="En el menú de la izquierda, andá a">
            &quot;Personalización&quot;.
          </Step>
          <Step number={2} title="Revisá los datos">
            (nombre del negocio, horarios, servicios) y ajustalos si hace falta.
          </Step>
          <Step number={3} title="Al final de la página, tocá">
            el botón &quot;Publicar&quot;. Esto crea tu asistente de voz en VAPI.
          </Step>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <PhoneIcon size={16} className="text-primary" /> 3. Conseguí un número de teléfono
        </div>
        <div className="space-y-3 pl-1">
          <div>
            <p className="text-sm font-medium">Opción rápida (número de EE.UU., para probar ya mismo):</p>
            <div className="mt-2 space-y-2">
              <Step number={1} title="En la tarjeta">
                &quot;Asistente y número de teléfono&quot; de más abajo, tocá &quot;Obtener número automáticamente&quot;.
              </Step>
              <Step number={2} title="Ojo:">
                VAPI puede pedirte cargar una tarjeta la primera vez (adentro de vapi.ai: Settings → Billing).
              </Step>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Opción con número de Argentina (recomendada para tus clientes):</p>
            <div className="mt-2 space-y-2">
              <Step number={1} title="Entrá a">
                {" "}
                <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  twilio.com
                </a>{" "}
                y creá una cuenta.
              </Step>
              <Step number={2} title="Comprá un número argentino">
                (te van a pedir verificar tu identidad, puede tardar un poco).
              </Step>
              <Step number={3} title="En la Consola de Twilio">
                copiá el &quot;Account SID&quot; y el &quot;Auth Token&quot; (están en la página principal, apenas entrás).
              </Step>
              <Step number={4} title="Volvé a esta página">
                , abrí &quot;Importar un número propio de Twilio&quot;, pegá esos 3 datos y tocá &quot;Importar y vincular&quot;.
              </Step>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarBlankIcon size={16} className="text-primary" /> 4. Conectá Google Calendar
        </div>
        <div className="space-y-2 pl-1">
          <Step number={1} title="En la tarjeta">
            &quot;Google Calendar&quot; de más abajo, tocá &quot;Conectar con Google&quot;.
          </Step>
          <Step number={2} title="Iniciá sesión">
            con la cuenta de Google donde querés que se agenden las citas.
          </Step>
          <Step number={3} title="Aceptá los permisos">
            que te pide Google.
          </Step>
          <Step number={4} title="Listo:">
            va a aparecer &quot;Conectado&quot; en esa tarjeta.
          </Step>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <WhatsappLogoIcon size={16} className="text-primary" weight="fill" /> 5. Activá WhatsApp (opcional)
        </div>
        <div className="space-y-2 pl-1">
          <p className="text-sm text-muted">
            El mismo asistente responde automáticamente por WhatsApp. Usamos la API directa de Meta — te dan un número de
            prueba gratis al instante, sin esperar aprobación.
          </p>
          <Step number={1} title="Entrá a">
            {" "}
            <a
              href="https://developers.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              developers.facebook.com
            </a>{" "}
            e iniciá sesión con tu cuenta de Facebook.
          </Step>
          <Step number={2} title="Si te aparece un aviso de seguridad ('No puedes realizar el cambio en este momento')">
            probá primero entrar a facebook.com normal, navegar un poco, y volver a intentar — o probá desde el navegador
            del celular donde ya estés logueado habitualmente.
          </Step>
          <Step number={3} title="Creá una App nueva">
            (botón &quot;Create App&quot;), elegí el tipo &quot;Business&quot;, y dentro agregá el producto
            &quot;WhatsApp&quot;.
          </Step>
          <Step number={4} title="En la sección &quot;API Setup&quot; de WhatsApp vas a ver">
            un número de prueba ya creado, con su <b>Phone Number ID</b> y un <b>Temporary access token</b> — copiá los dos.
          </Step>
          <Step number={5} title="En esa misma pantalla, agregá tu propio celular">
            como número de prueba destinatario (&quot;To&quot;) y verificalo con el código que te llega.
          </Step>
          <Step number={6} title="Inventá una palabra cualquiera">
            (por ejemplo &quot;asistente2026&quot;) — la vas a usar como &quot;Verify Token&quot; en el próximo paso y en
            el panel.
          </Step>
          <Step number={7} title="Buscá la sección &quot;Configuration&quot; → &quot;Webhook&quot;">
            y pegá esta URL de Callback:
          </Step>
          <p className="ml-9 select-all break-all rounded-lg border border-border bg-black/5 px-3 py-2 font-mono text-xs dark:bg-white/5">
            {webhookUrl}
          </p>
          <Step number={8} title="En el campo &quot;Verify token&quot; pegá">
            la misma palabra que inventaste en el paso 6, y guardá. Después suscribite al campo &quot;messages&quot;.
          </Step>
          <Step number={9} title="Volvé a esta página, en la tarjeta">
            &quot;WhatsApp&quot; de más abajo, completá el número de prueba, el Phone Number ID, el Access Token y la
            misma palabra de Verify Token, y tocá &quot;Conectar WhatsApp&quot;.
          </Step>
          <Step number={10} title="Listo:">
            mandale un WhatsApp desde tu celular (el que verificaste) a ese número de prueba, y el asistente te va a
            contestar solo.
          </Step>
        </div>
      </div>
    </Card>
  );
}
