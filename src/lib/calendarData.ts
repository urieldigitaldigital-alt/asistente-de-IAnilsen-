import type { SupabaseClient } from "@supabase/supabase-js";

import { listCalendarEvents } from "@/lib/google/calendar";
import type { Appointment, Clinic, Database } from "@/types/database";

export interface ExternalCalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  htmlLink: string | null;
}

export interface CalendarMonthData {
  appointments: Appointment[];
  externalEvents: ExternalCalendarEvent[];
}

export function parseMonthParam(month?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const [year, monthIndex] = month && /^\d{4}-\d{2}$/.test(month) ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];

  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);

  return { start, end, label };
}

export function shiftMonthParam(month: string, delta: number): string {
  const { start } = parseMonthParam(month);
  const shifted = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getCalendarMonthData(
  supabase: SupabaseClient<Database>,
  clinic: Clinic,
  monthStart: Date,
  monthEnd: Date
): Promise<CalendarMonthData> {
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .gte("start_time", monthStart.toISOString())
    .lt("start_time", monthEnd.toISOString())
    .order("start_time", { ascending: true });

  const knownEventIds = new Set((appointments ?? []).map((a) => a.google_event_id).filter(Boolean));

  let externalEvents: ExternalCalendarEvent[] = [];
  try {
    const googleEvents = await listCalendarEvents(supabase, clinic.id, monthStart, monthEnd);
    externalEvents = googleEvents
      .filter((event) => event.id && !knownEventIds.has(event.id))
      .map((event) => ({
        id: event.id as string,
        summary: event.summary ?? "(sin título)",
        start: event.start?.dateTime ?? event.start?.date ?? null,
        htmlLink: event.htmlLink ?? null,
      }));
  } catch (err) {
    console.error("No se pudieron leer eventos de Google Calendar:", err);
  }

  return { appointments: appointments ?? [], externalEvents };
}
