import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";

import { AppointmentRow } from "@/components/calendar/AppointmentRow";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ExternalCalendarEvent } from "@/lib/calendarData";
import type { Appointment } from "@/types/database";

function localDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso)
  );
}

function formatDayHeading(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    date
  );
}

interface DayGroup {
  appointments: Appointment[];
  external: ExternalCalendarEvent[];
}

export function CalendarAgenda({
  appointments,
  externalEvents,
  timeZone,
}: {
  appointments: Appointment[];
  externalEvents: ExternalCalendarEvent[];
  timeZone: string;
}) {
  const groups = new Map<string, DayGroup>();

  const getGroup = (key: string): DayGroup => {
    let group = groups.get(key);
    if (!group) {
      group = { appointments: [], external: [] };
      groups.set(key, group);
    }
    return group;
  };

  for (const appointment of appointments) {
    getGroup(localDateKey(appointment.start_time, timeZone)).appointments.push(appointment);
  }
  for (const event of externalEvents) {
    if (!event.start) continue;
    getGroup(localDateKey(event.start, timeZone)).external.push(event);
  }

  const sortedKeys = Array.from(groups.keys()).sort();

  if (sortedKeys.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlankIcon}
        title="Sin citas este mes"
        description="Las citas agendadas por el asistente o creadas en Google Calendar aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-6">
      {sortedKeys.map((key) => {
        const group = groups.get(key) as DayGroup;
        return (
          <div key={key}>
            <h3 className="mb-2 text-sm font-semibold capitalize">{formatDayHeading(key)}</h3>
            <div className="space-y-2">
              {group.appointments.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} timeZone={timeZone} />
              ))}
              {group.external.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted"
                >
                  <span className="w-16 shrink-0">
                    {event.start
                      ? new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(
                          new Date(event.start)
                        )
                      : "Todo el día"}
                  </span>
                  <span className="flex-1 truncate">{event.summary} (Google Calendar)</span>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Ver
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
