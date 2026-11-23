import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Eliminación de datos — Asistente Nilsen IA" };

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Eliminación de datos</h1>
        <p className="mt-1 text-sm text-muted">Cómo pedir que borremos tu información.</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-base font-semibold text-foreground">Si sos dueño de un negocio</h2>
            <p className="mt-2">
              Podés pedir la eliminación completa de tu cuenta (configuración del asistente, historial de
              conversaciones, citas y credenciales conectadas) escribiendo a{" "}
              <a href="mailto:urielbarboza2020@gmail.com" className="text-primary underline underline-offset-2">
                urielbarboza2020@gmail.com
              </a>{" "}
              desde el correo con el que te registraste. Vamos a confirmarte por ese mismo medio cuando el borrado
              se haya completado, dentro de los 30 días siguientes al pedido.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Si sos cliente de un negocio que usa Asistente Nilsen IA</h2>
            <p className="mt-2">
              Si le escribiste por WhatsApp a un negocio que usa nuestra plataforma y querés que eliminemos el
              historial de esa conversación, escribinos a{" "}
              <a href="mailto:urielbarboza2020@gmail.com" className="text-primary underline underline-offset-2">
                urielbarboza2020@gmail.com
              </a>{" "}
              indicando el número de WhatsApp desde el que escribiste y el nombre del negocio. Vamos a eliminar
              esos mensajes de nuestra base de datos dentro de los 30 días siguientes al pedido.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Qué se elimina</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>El historial de mensajes de WhatsApp guardado en nuestra base de datos.</li>
              <li>Las citas y datos de contacto asociados a esa conversación.</li>
              <li>Cualquier credencial de acceso conectada (WhatsApp Business, Google Calendar), si se trata de una cuenta de negocio.</li>
            </ul>
            <p className="mt-2">
              Más información sobre qué datos recolectamos y por qué en nuestra{" "}
              <Link href="/politica-de-privacidad" className="text-primary underline underline-offset-2">
                política de privacidad
              </Link>
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
