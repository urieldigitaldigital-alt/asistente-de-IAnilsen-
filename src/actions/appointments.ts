"use server";

import { revalidatePath } from "next/cache";

import { deleteCalendarEvent } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";

export async function cancelAppointmentAction(appointmentId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();
  if (fetchError || !appointment) {
    return { error: "No se encontró la cita." };
  }

  if (appointment.google_event_id) {
    await deleteCalendarEvent(supabase, appointment.clinic_id, appointment.google_event_id);
  }

  const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appointmentId);
  if (error) return { error: error.message };

  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  return { error: null };
}
