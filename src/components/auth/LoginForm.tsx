"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { login, type AuthFormState } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

const initialState: AuthFormState = { error: null };

export function LoginForm({ confirmEmail }: { confirmEmail: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  // Recarga completa (no navegación de Next.js) para asegurar que no quede
  // en memoria ningún dato de una sesión anterior si se estaba usando otra
  // cuenta en esta misma pestaña.
  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state.redirectTo]);

  const busy = pending || Boolean(state.redirectTo);

  return (
    <form action={formAction} className="space-y-4">
      {busy && <LoadingOverlay text="Iniciando sesión…" />}
      {confirmEmail && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.
        </p>
      )}
      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Ingresando…" : "Ingresar"}
      </Button>
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Crea tu cuenta
        </Link>
      </p>
    </form>
  );
}
