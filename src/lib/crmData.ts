import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppointmentStatus, Database } from "@/types/database";

export interface CrmLead {
  id: string;
  name: string;
  phone: string;
  service: string;
  startTime: string;
  status: AppointmentStatus;
  notes: string | null;
}

export interface CrmData {
  messagesSent: number;
  messagesReceived: number;
  callsInbound: number;
  callsOutbound: number;
  meetingsScheduled: number;
  leads: CrmLead[];
}

/** Estadísticas de prospección (CRM): mensajes enviados/recibidos, llamadas entrantes/salientes, y reuniones agendadas con leads. */
export async function getCrmData(supabase: SupabaseClient<Database>): Promise<CrmData> {
  const [messagesSentRes, messagesReceivedRes, callsInboundRes, callsOutboundRes, appointmentsRes] = await Promise.all([
    supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).in("role", ["assistant", "business"]),
    supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("calls").select("id", { count: "exact", head: true }).eq("direction", "inbound"),
    supabase.from("calls").select("id", { count: "exact", head: true }).eq("direction", "outbound"),
    supabase
      .from("appointments")
      .select("id, patient_name, patient_phone, treatment, start_time, status, notes")
      .order("start_time", { ascending: false })
      .limit(300),
  ]);

  const appointments = appointmentsRes.data ?? [];

  return {
    messagesSent: messagesSentRes.count ?? 0,
    messagesReceived: messagesReceivedRes.count ?? 0,
    callsInbound: callsInboundRes.count ?? 0,
    callsOutbound: callsOutboundRes.count ?? 0,
    meetingsScheduled: appointments.length,
    leads: appointments.map((a) => ({
      id: a.id,
      name: a.patient_name,
      phone: a.patient_phone,
      service: a.treatment,
      startTime: a.start_time,
      status: a.status,
      notes: a.notes,
    })),
  };
}
