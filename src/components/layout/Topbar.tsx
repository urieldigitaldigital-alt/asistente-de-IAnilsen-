"use client";

import { SignOutIcon } from "@phosphor-icons/react";

import { logout } from "@/actions/auth";

export function Topbar({ userLabel }: { userLabel: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <p className="text-sm text-muted">{userLabel}</p>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
        >
          <SignOutIcon size={16} />
          Cerrar sesión
        </button>
      </form>
    </header>
  );
}
