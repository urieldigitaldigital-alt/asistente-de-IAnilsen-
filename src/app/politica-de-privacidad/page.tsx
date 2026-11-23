import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidad — Asistente Nilsen IA" };

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Política de privacidad</h1>
        <p className="mt-1 text-sm text-muted">Última actualización: noviembre de 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Quiénes somos</h2>
            <p className="mt-2">
              Asistente Nilsen IA es una plataforma que permite a negocios (clínicas, restaurantes, inmobiliarias,
              comercios y otros servicios) conectar su número de WhatsApp Business para que un asistente de
              inteligencia artificial responda mensajes de sus clientes, agende citas y tome pedidos en su nombre.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Qué datos recolectamos</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Datos de la cuenta del negocio: nombre, correo electrónico y la configuración del asistente (tono, información del negocio, reglas de agendamiento).</li>
              <li>Datos de WhatsApp Business: el número conectado y el contenido de los mensajes intercambiados entre el asistente y los clientes finales del negocio.</li>
              <li>Datos de Google Calendar, únicamente si el negocio decide conectarlo: disponibilidad y citas creadas por el asistente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Para qué los usamos</h2>
            <p className="mt-2">
              Usamos estos datos exclusivamente para operar el servicio: generar las respuestas automáticas del
              asistente, agendar o reprogramar citas, armar el panel de seguimiento (CRM) del negocio y enviar
              recordatorios de seguimiento cuando un cliente no responde.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Con quién se comparten los datos</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Meta / WhatsApp Business Platform</strong>, para enviar y recibir los mensajes de WhatsApp.</li>
              <li><strong>Google Calendar API</strong>, solo si el negocio conectó su calendario, para consultar disponibilidad y crear eventos.</li>
              <li><strong>Anthropic (modelos Claude)</strong>, para generar las respuestas de inteligencia artificial a partir de la conversación.</li>
              <li><strong>Supabase</strong>, como proveedor de base de datos e infraestructura donde se almacena la información.</li>
            </ul>
            <p className="mt-2">No vendemos ni compartimos estos datos con terceros para fines publicitarios.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Seguridad</h2>
            <p className="mt-2">
              Cada negocio solo puede acceder a sus propios datos (clientes, conversaciones, citas): la base de
              datos aplica reglas de seguridad a nivel de fila (Row Level Security) para aislar la información de
              cada cuenta. Las credenciales sensibles se guardan cifradas.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Retención y eliminación</h2>
            <p className="mt-2">
              Conservamos los datos mientras la cuenta del negocio esté activa. Cualquier persona —el dueño del
              negocio o un cliente final que haya escrito por WhatsApp— puede pedir que se elimine su información
              siguiendo los pasos de nuestra{" "}
              <Link href="/eliminacion-de-datos" className="text-primary underline underline-offset-2">
                página de eliminación de datos
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">7. Cambios a esta política</h2>
            <p className="mt-2">
              Si actualizamos esta política de forma relevante, lo vamos a reflejar en esta misma página con una
              nueva fecha de actualización.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">8. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre privacidad o para ejercer tus derechos sobre tus datos, escribinos a{" "}
              <a href="mailto:urielbarboza2020@gmail.com" className="text-primary underline underline-offset-2">
                urielbarboza2020@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-primary underline underline-offset-2">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
