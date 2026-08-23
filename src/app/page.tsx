import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/CtaSection";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { Testimonials } from "@/components/marketing/Testimonials";

export const metadata: Metadata = {
  title: "Asistente Nilsen IA — Agente de voz con IA para agendar citas",
  description:
    "Agente de voz con IA que atiende llamadas y agenda citas en Google Calendar para cualquier negocio: clínicas, salones, consultorios y más.",
};

// proxy.ts ya redirige a un usuario con sesión activa hacia /dashboard antes
// de llegar aquí, así que esta página solo la ve un visitante sin sesión.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Testimonials />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
