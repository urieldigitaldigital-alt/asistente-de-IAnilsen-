import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

import type { Database } from "@/types/database";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:soporte@asistentnilsenia.com", publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Manda una notificación push del navegador a todos los dispositivos
 * suscriptos del negocio (panel de CRM). Nunca debe romper el flujo que la
 * dispara (ej. agendar una cita) si el envío falla — cada suscripción se
 * intenta por separado, y las que ya no son válidas (410/404) se borran.
 */
export async function sendPushToClinic(
  admin: SupabaseClient<Database>,
  clinicId: string,
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured()) return;

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("clinic_id", clinicId);
  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("No se pudo enviar la notificación push:", err);
        }
      }
    })
  );
}
