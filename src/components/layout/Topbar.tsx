"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { useTransition } from "react";

import { logout } from "@/actions/auth";

export function Topbar({ userLabel }: { userLabel: string }) {
  const [isPending, startTransition] = useTransition();

  // Recarga completa (no router.push) al cerrar sesión: así se garantiza que
  // no quede en memoria ningún dato ni suscripción Realtime de esta cuenta
  // si a continuación se entra con otra en la misma pestaña.
  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      window.location.href = "/login";
    });
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <p className="text-sm text-muted">{userLabel}</p>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5 disabled:opacity-60"
      >
        <SignOutIcon size={16} />
        {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </header>
  );
}
