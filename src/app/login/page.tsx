import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Iniciar sesión — Asistente Nilsen IA" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold">Asistente Nilsen IA</h1>
        <p className="mb-6 text-center text-sm text-muted">Ingresa al panel de tu negocio</p>
        <Card>
          <LoginForm confirmEmail={message === "confirm-email"} />
        </Card>
      </div>
    </div>
  );
}
