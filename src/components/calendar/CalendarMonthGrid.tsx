"use client";

import type { DayGroup } from "@/lib/calendarGrouping";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Lunes=0 ... Domingo=6, calculado a partir de una fecha calendario pura (sin timezone). */
function weekdayMondayFirst(year: number, month: number, day: number): number {
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsWeekday + 6) % 7;
}

export function CalendarMonthGrid({
  year,
  month,
  groups,
  timeZone,
  selectedDay,
  onSelectDay,
}: {
  year: number;
  month: number;
  groups: Map<string, DayGroup>;
  timeZone: string;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = weekdayMondayFirst(year, month, 1);
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );

  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} />;

          const key = dayKey(year, month, day);
          const group = groups.get(key);
          const activeAppointments = group?.appointments.filter((a) => a.status !== "cancelled") ?? [];
          const hasAppointments = activeAppointments.length > 0;
          const hasExternal = (group?.external.length ?? 0) > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(isSelected ? null : key)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors ${
                isSelected
                  ? "border-primary bg-primary/15 font-semibold"
                  : hasAppointments
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
              } ${isToday ? "ring-1 ring-primary" : ""}`}
            >
              <span>{day}</span>
              {(hasAppointments || hasExternal) && (
                <span className="flex items-center gap-0.5">
                  {hasAppointments && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" title={`${activeAppointments.length} cita(s)`} />
                  )}
                  {hasExternal && <span className="h-1.5 w-1.5 rounded-full bg-muted" title="Eventos de Google Calendar" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
