"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { cancelAppointmentAction, completeAppointmentAction } from "@/actions/appointments";

export function LeadStatusActions({ appointmentId }: { appointmentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(action: (id: string) => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(appointmentId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="Marcar como realizada"
        disabled={pending}
        onClick={() => handle(completeAppointmentAction)}
        className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
      >
        <CheckIcon size={14} weight="bold" />
      </button>
      <button
        type="button"
        title="Cancelar"
        disabled={pending}
        onClick={() => handle(cancelAppointmentAction)}
        className="rounded p-1 text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        <XIcon size={14} weight="bold" />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
