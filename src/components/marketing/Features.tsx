import {
  CalendarCheckIcon,
  ChatCircleTextIcon,
  ClockIcon,
  GearSixIcon,
  GoogleLogoIcon,
  SpeakerHighIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "@/components/marketing/Reveal";

const FEATURES = [
  {
    icon: ClockIcon,
    title: "Disponible 24/7",
    description: "Tu negocio nunca pierde una llamada, ni fuera de horario ni con el teléfono ocupado.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Agenda en tiempo real",
    description: "Consulta disponibilidad y agenda o cancela citas directo en tu Google Calendar, sin pisar turnos.",
  },
  {
    icon: SpeakerHighIcon,
    title: "Voz natural en español",
    description: "Voces realistas (Azure o ElevenLabs) con acento configurable, pensadas para sonar como una persona real.",
  },
  {
    icon: GearSixIcon,
    title: "100% personalizable",
    description: "Editá el guion, el tono, los servicios y los horarios de atención desde un panel simple, sin tocar código.",
  },
  {
    icon: ChatCircleTextIcon,
    title: "Transcripción de cada llamada",
    description: "Revisá qué se dijo en cada llamada y qué citas se generaron, todo organizado en un solo lugar.",
  },
  {
    icon: GoogleLogoIcon,
    title: "Se adapta a tu negocio",
    description: "Clínicas, salones, consultorios, spas: cualquier negocio que agende citas por teléfono puede usarlo.",
  },
];

export function Features() {
  return (
    <section id="solucion" className="border-t border-border bg-surface/50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">La solución completa para no perder ni una cita</h2>
          <p className="mt-3 text-muted">Desde la primera llamada hasta la confirmación en el calendario, todo automatizado.</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 60}>
              <div className="h-full rounded-xl border border-border bg-surface p-6 shadow-sm transition-transform hover:-translate-y-1">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <feature.icon size={22} weight="duotone" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
