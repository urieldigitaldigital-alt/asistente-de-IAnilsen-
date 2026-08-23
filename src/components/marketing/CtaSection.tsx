import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Reveal } from "@/components/marketing/Reveal";

export function CtaSection() {
  return (
    <section className="border-t border-border py-20">
      <Reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Empezá a agendar citas con IA hoy</h2>
        <p className="mt-3 text-muted">Creá tu cuenta, personalizá tu asistente y publicalo en minutos.</p>
        <div className="mt-7">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Crear cuenta gratis
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
