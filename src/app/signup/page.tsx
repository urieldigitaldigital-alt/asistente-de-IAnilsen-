import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Crear cuenta — Asistente Nilsen IA" };

export default function SignupPage() {
  return (
    <AuthShell title="Asistente Nilsen IA" subtitle="Crea la cuenta de tu negocio y configura tu asistente de WhatsApp">
      <SignupForm />
    </AuthShell>
  );
}
