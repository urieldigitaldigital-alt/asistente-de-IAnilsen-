import { QuotesIcon, StarIcon } from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "@/components/marketing/Reveal";

const TESTIMONIALS = [
  {
    quote:
      "Antes perdíamos llamadas fuera de horario y algunos pacientes no volvían a llamar. Ahora el asistente agenda solo y llegamos al día con la agenda llena.",
    name: "Valentina R.",
    role: "Dueña, clínica dental",
  },
  {
    quote:
      "Lo configuré para mi salón en una tarde. Suena natural, agenda bien los turnos y me avisa al toque si alguien necesita hablar conmigo.",
    name: "Martín G.",
    role: "Dueño, salón de belleza",
  },
  {
    quote:
      "Lo que más valoro es que veo la transcripción de cada llamada. Puedo revisar exactamente qué le dijeron a cada cliente.",
    name: "Sofía L.",
    role: "Encargada, centro de estética",
  },
];

export function Testimonials() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Negocios que ya no pierden citas</h2>
          <p className="mt-3 text-muted">Ejemplos de cómo distintos negocios usan el asistente en su día a día.</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <Reveal key={testimonial.name} delayMs={index * 80}>
              <figure className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-sm">
                <QuotesIcon size={24} weight="fill" className="mb-3 text-primary/40" />
                <div className="mb-3 flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={14} weight="fill" />
                  ))}
                </div>
                <blockquote className="flex-1 text-sm text-foreground">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 border-t border-border pt-3">
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted">{testimonial.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
