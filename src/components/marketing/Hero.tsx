import { ArrowRightIcon, PhoneCallIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Degradado radial en vez de un elemento con filter:blur() — un blur grande
          combinado con backdrop-blur en el navbar causaba fallas de renderizado
          en algunos motores (capas en blanco al hacer scroll/capturar). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-96"
        style={{ background: "radial-gradient(closest-side, var(--color-primary) 0%, transparent 70%)", opacity: 0.15 }}
      />
      {/* Ya visible al cargar la página (above the fold): sin animación de
          scroll-reveal, que causaría un parpadeo/retraso en lo primero que ve el visitante. */}
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <PhoneCallIcon size={14} className="text-primary" />
          Agente de voz con IA para agendar citas
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Un asistente de IA que atiende el teléfono y agenda citas por vos, las 24 horas
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted">
          Ideal para clínicas, salones, consultorios y cualquier negocio con agendamiento de citas. Responde llamadas, consulta
          disponibilidad, agenda en Google Calendar y te avisa cuando alguien necesita atención humana.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Crear cuenta gratis
            <ArrowRightIcon size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
