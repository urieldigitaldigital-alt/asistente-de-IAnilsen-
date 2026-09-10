import type { Metadata } from "next";

import { WhatsAppInbox } from "@/components/whatsapp/WhatsAppInbox";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "WhatsApp — Asistente Nilsen IA" };

export default async function WhatsAppPage() {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id, timezone").single();
  if (!clinic) return null;

  const { data: conversations } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("clinic_id", clinic.id)
    .order("last_message_at", { ascending: false });

  const sessionIds = (conversations ?? []).map((c) => c.id);
  const { data: linkedAppointments } = sessionIds.length
    ? await supabase
        .from("appointments")
        .select("whatsapp_session_id, is_new_patient, created_at")
        .in("whatsapp_session_id", sessionIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Si hubo más de una cita para la misma conversación, nos quedamos con la
  // más reciente para decidir la etiqueta (ya vienen ordenadas desc arriba).
  const isNewPatientBySession: Record<string, boolean> = {};
  for (const appt of linkedAppointments ?? []) {
    if (appt.whatsapp_session_id && !(appt.whatsapp_session_id in isNewPatientBySession)) {
      isNewPatientBySession[appt.whatsapp_session_id] = appt.is_new_patient;
    }
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div>
        <h1 className="text-xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-muted">Conversaciones del asistente por WhatsApp, en vivo.</p>
      </div>
      <WhatsAppInbox
        clinicId={clinic.id}
        timeZone={clinic.timezone}
        initialConversations={conversations ?? []}
        isNewPatientBySession={isNewPatientBySession}
      />
    </div>
  );
}
