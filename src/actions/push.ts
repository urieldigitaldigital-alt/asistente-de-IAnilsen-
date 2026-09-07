"use server";

import { createClient } from "@/lib/supabase/server";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Guarda la suscripción a notificaciones push de este dispositivo/navegador para el negocio del usuario. */
export async function subscribeToPushAction(input: PushSubscriptionInput): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return { error: "No se encontró el negocio." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { clinic_id: clinic.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth },
      { onConflict: "endpoint" }
    );
  if (error) return { error: error.message };
  return { error: null };
}

/** Da de baja la suscripción de este dispositivo/navegador (ej. el usuario desactiva las notificaciones). */
export async function unsubscribeFromPushAction(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
