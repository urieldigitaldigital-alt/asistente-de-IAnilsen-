import type { Appointment } from "@/types/database";

export interface ExternalCalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  htmlLink: string | null;
}

export interface DayGroup {
  appointments: Appointment[];
  external: ExternalCalendarEvent[];
}

export function localDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso)
  );
}

/** Agrupa citas y eventos externos por día de calendario en la timezone de la clínica. */
export function groupByLocalDay(
  appointments: Appointment[],
  externalEvents: ExternalCalendarEvent[],
  timeZone: string
): Map<string, DayGroup> {
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

  return groups;
}
