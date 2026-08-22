"use client";

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { cancelAppointmentAction } from "@/actions/appointments";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Appointment } from "@/types/database";

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function AppointmentRow({ appointment, timeZone }: { appointment: Appointment; timeZone: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cancelled = appointment.status === "cancelled";

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="w-16 shrink-0 text-sm font-medium text-muted">
          {formatTime(appointment.start_time, timeZone)}
        </span>
        <span className={`flex-1 truncate text-sm ${cancelled ? "text-muted line-through" : ""}`}>
          {appointment.patient_name} — {appointment.treatment}
        </span>
        {appointment.is_new_patient && !cancelled && <Badge tone="success">Nuevo</Badge>}
        {cancelled && <Badge tone="danger">Cancelada</Badge>}
        {open ? <CaretUpIcon size={16} /> : <CaretDownIcon size={16} />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-3 text-sm">
          <p>
            <span className="text-muted">Teléfono: </span>
            {appointment.patient_phone}
          </p>
          {appointment.patient_email && (
            <p>
              <span className="text-muted">Correo: </span>
              {appointment.patient_email}
            </p>
          )}
          {appointment.notes && (
            <p>
              <span className="text-muted">Notas: </span>
              {appointment.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-4 pt-1">
            {appointment.call_id && (
              <Link href={`/transcripciones/${appointment.call_id}`} className="font-medium text-primary hover:underline">
                Ver transcripción
              </Link>
            )}
            {appointment.google_event_link && (
              <a
                href={appointment.google_event_link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Ver en Google Calendar
              </a>
            )}
          </div>
          {!cancelled && (
            <div className="pt-1">
              {error && <p className="mb-2 text-danger">{error}</p>}
              <Button
                type="button"
                variant="danger"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await cancelAppointmentAction(appointment.id);
                    if (result.error) setError(result.error);
                  })
                }
              >
                {isPending ? "Cancelando…" : "Cancelar cita"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
