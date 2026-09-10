import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión — Asistente Nilsen IA" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <AuthShell title="Asistente Nilsen IA" subtitle="Ingresa al panel de tu negocio">
      <LoginForm confirmEmail={message === "confirm-email"} />
    </AuthShell>
  );
}
