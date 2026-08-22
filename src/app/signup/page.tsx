import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Crear clínica — Asistente Dental IA" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold">Asistente Dental IA</h1>
        <p className="mb-6 text-center text-sm text-muted">
          Crea la cuenta de tu clínica y configura tu agente de voz
        </p>
        <Card>
          <SignupForm />
        </Card>
      </div>
    </div>
  );
}
