import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";

import { AppointmentRow } from "@/components/calendar/AppointmentRow";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DayGroup } from "@/lib/calendarGrouping";

function formatDayHeading(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    date
  );
}

export function CalendarAgenda({
  groups,
  timeZone,
  emptyTitle = "Sin citas este mes",
}: {
  groups: Map<string, DayGroup>;
  timeZone: string;
  emptyTitle?: string;
}) {
  const sortedKeys = Array.from(groups.keys()).sort();

  if (sortedKeys.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlankIcon}
        title={emptyTitle}
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
