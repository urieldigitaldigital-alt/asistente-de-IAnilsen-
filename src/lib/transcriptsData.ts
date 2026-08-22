import type { SupabaseClient } from "@supabase/supabase-js";

import type { Appointment, Call, Database, Transcript } from "@/types/database";

export interface CallListItem {
  id: string;
  when: string | null;
  phoneNumber: string | null;
  status: string | null;
  summary: string | null;
  hasAppointment: boolean;
}

export interface TranscriptListFilters {
  q?: string;
  date?: string;
  hasAppointment?: "yes" | "no";
}

export async function listCalls(
  supabase: SupabaseClient<Database>,
  filters: TranscriptListFilters
): Promise<CallListItem[]> {
  let query = supabase.from("calls").select("*").order("created_at", { ascending: false }).limit(100);

  if (filters.q) {
    const term = filters.q.trim().replace(/[%_,]/g, " ").trim();
    if (term) query = query.or(`phone_number.ilike.%${term}%,summary.ilike.%${term}%`);
  }
  if (filters.date) {
    const start = new Date(`${filters.date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60_000);
    query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }

  const { data: calls } = await query;
  const { data: apptRows } = await supabase.from("appointments").select("call_id").not("call_id", "is", null);
  const apptCallIds = new Set((apptRows ?? []).map((row) => row.call_id));

  let items: CallListItem[] = (calls ?? []).map((call) => ({
    id: call.id,
    when: call.started_at ?? call.created_at,
    phoneNumber: call.phone_number,
    status: call.status,
    summary: call.summary,
    hasAppointment: apptCallIds.has(call.id),
  }));

  if (filters.hasAppointment === "yes") items = items.filter((item) => item.hasAppointment);
  if (filters.hasAppointment === "no") items = items.filter((item) => !item.hasAppointment);

  return items;
}

export interface CallDetail {
  call: Call;
  transcriptTurns: Transcript[];
  fullTranscript: string | null;
  appointment: Appointment | null;
}

export async function getCallDetail(supabase: SupabaseClient<Database>, callId: string): Promise<CallDetail | null> {
  const { data: call } = await supabase.from("calls").select("*").eq("id", callId).single();
  if (!call) return null;

  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("*")
    .eq("call_id", callId)
    .order("created_at", { ascending: true });

  const fullRow = (transcripts ?? []).find((row) => row.full_transcript);
  const turns = (transcripts ?? []).filter((row) => row.role && row.text);

  const { data: appointment } = await supabase.from("appointments").select("*").eq("call_id", callId).maybeSingle();

  return {
    call,
    transcriptTurns: turns,
    fullTranscript: fullRow?.full_transcript ?? null,
    appointment: appointment ?? null,
  };
}
