import type { SupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";

import { getAuthorizedClient } from "@/lib/google/oauth";
import type { BusyRange } from "@/lib/availability";
import type { Database } from "@/types/database";

async function getCalendarContext(supabase: SupabaseClient<Database>, clinicId: string) {
  const auth = await getAuthorizedClient(supabase, clinicId);
  if (!auth) return null;

  const { data: creds } = await supabase
    .from("google_credentials")
    .select("calendar_id")
    .eq("clinic_id", clinicId)
    .single();

  return {
    client: google.calendar({ version: "v3", auth }),
    calendarId: creds?.calendar_id ?? "primary",
  };
}

export async function getFreeBusy(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusyRange[]> {
  const ctx = await getCalendarContext(supabase, clinicId);
  if (!ctx) return [];

  const res = await ctx.client.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: ctx.calendarId }],
    },
  });

  const busy = res.data.calendars?.[ctx.calendarId]?.busy ?? [];
  return busy
    .filter((slot) => slot.start && slot.end)
    .map((slot) => ({ start: new Date(slot.start as string), end: new Date(slot.end as string) }));
}

export interface InsertEventParams {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  timeZone: string;
  attendeeEmail?: string;
}

export interface InsertedEvent {
  id: string;
  htmlLink: string | null;
}

export async function insertCalendarEvent(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  params: InsertEventParams
): Promise<InsertedEvent> {
  const ctx = await getCalendarContext(supabase, clinicId);
  if (!ctx) throw new Error("La clínica no tiene Google Calendar conectado.");

  const res = await ctx.client.events.insert({
    calendarId: ctx.calendarId,
    sendUpdates: params.attendeeEmail ? "all" : "none",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.start.toISOString(), timeZone: params.timeZone },
      end: { dateTime: params.end.toISOString(), timeZone: params.timeZone },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
    },
  });

  if (!res.data.id) throw new Error("Google Calendar no devolvió un ID de evento.");
  return { id: res.data.id, htmlLink: res.data.htmlLink ?? null };
}

export async function deleteCalendarEvent(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  eventId: string
): Promise<void> {
  const ctx = await getCalendarContext(supabase, clinicId);
  if (!ctx) return;

  try {
    await ctx.client.events.delete({ calendarId: ctx.calendarId, eventId, sendUpdates: "all" });
  } catch (err) {
    const status = (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status;
    if (status !== 404 && status !== 410) throw err;
  }
}

export async function listCalendarEvents(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  timeMin: Date,
  timeMax: Date
) {
  const ctx = await getCalendarContext(supabase, clinicId);
  if (!ctx) return [];

  const res = await ctx.client.events.list({
    calendarId: ctx.calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items ?? [];
}
