"use client";

import { useMemo, useState } from "react";

import { CalendarAgenda } from "@/components/calendar/CalendarAgenda";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { Card } from "@/components/ui/Card";
import { groupByLocalDay, type ExternalCalendarEvent } from "@/lib/calendarGrouping";
import type { Appointment } from "@/types/database";

function formatSelectedDayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    date
  );
}

export function CalendarView({
  appointments,
  externalEvents,
  timeZone,
  year,
  month,
}: {
  appointments: Appointment[];
  externalEvents: ExternalCalendarEvent[];
  timeZone: string;
  year: number;
  month: number;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const groups = useMemo(
    () => groupByLocalDay(appointments, externalEvents, timeZone),
    [appointments, externalEvents, timeZone]
  );

  const visibleGroups = useMemo(() => {
    if (!selectedDay) return groups;
    const group = groups.get(selectedDay);
    return new Map(group ? [[selectedDay, group]] : []);
  }, [groups, selectedDay]);

  return (
    <div className="space-y-6">
      <Card>
        <CalendarMonthGrid
          year={year}
          month={month}
          groups={groups}
          timeZone={timeZone}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </Card>

      <Card>
        {selectedDay && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold capitalize">{formatSelectedDayLabel(selectedDay)}</h3>
            <button type="button" onClick={() => setSelectedDay(null)} className="text-sm font-medium text-primary hover:underline">
              Ver todo el mes
            </button>
          </div>
        )}
        <CalendarAgenda
          groups={visibleGroups}
          timeZone={timeZone}
          emptyTitle={selectedDay ? "Sin citas este día" : "Sin citas este mes"}
        />
      </Card>
    </div>
  );
}
