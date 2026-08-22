"use client";

import { Card } from "@/components/ui/Card";
import type { BusinessHours, DayHours } from "@/types/database";

const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export function BusinessHoursEditor({
  hours,
  onChange,
}: {
  hours: BusinessHours;
  onChange: (value: BusinessHours) => void;
}) {
  const setDay = (key: keyof BusinessHours, value: DayHours | null) => {
    onChange({ ...hours, [key]: value });
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold">Horario de atención</h2>
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = hours[key] ?? null;
          const open = day !== null;
          return (
            <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5">
              <label className="flex w-32 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={open}
                  onChange={(e) => setDay(key, e.target.checked ? { start: "09:00", end: "18:00" } : null)}
                />
                {label}
              </label>
              {open ? (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={day?.start ?? "09:00"}
                    onChange={(e) => setDay(key, { start: e.target.value, end: day?.end ?? "18:00" })}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                  />
                  <span className="text-muted">a</span>
                  <input
                    type="time"
                    value={day?.end ?? "18:00"}
                    onChange={(e) => setDay(key, { start: day?.start ?? "09:00", end: e.target.value })}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
