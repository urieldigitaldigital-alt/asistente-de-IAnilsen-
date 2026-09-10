import { NextResponse, type NextRequest } from "next/server";

import { constantTimeEqual } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { replyToPendingWhatsappSession } from "@/lib/whatsapp/chat";
import { getOwnWhatsappCredentials } from "@/lib/whatsapp/credentials";

/**
 * Disparado por un cron (pg_cron + pg_net, cada 1 minuto — ver migración
 * 0032) para contestar las conversaciones de WhatsApp cuya demora de
 * respuesta ya se cumplió (ver api/whatsapp/webhook, que ya no contesta al
 * instante). Nunca se llama desde el navegador ni desde Meta.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  const expected = process.env.WHATSAPP_CRON_SECRET ?? "";
  if (!expected || !constantTimeEqual(secret, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Update atómico: cada fila solo puede ser "reclamada" una vez, aunque dos
  // corridas del cron se solapen — Postgres serializa el UPDATE por fila.
  const { data: due, error } = await admin
    .from("whatsapp_sessions")
    .update({ pending_reply_at: null })
    .lte("pending_reply_at", new Date().toISOString())
    .select("id, clinic_id, customer_phone");

  if (error) {
    console.error("Error reclamando conversaciones de WhatsApp pendientes:", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const session of due) {
    try {
      const [{ data: clinic }, { data: config }, credentials] = await Promise.all([
        admin.from("clinics").select("*").eq("id", session.clinic_id).single(),
        admin.from("agent_configs").select("*").eq("clinic_id", session.clinic_id).single(),
        getOwnWhatsappCredentials(session.clinic_id, admin),
      ]);
      if (!clinic || !config || !credentials) continue;

      await replyToPendingWhatsappSession({
        admin,
        clinic,
        config,
        sessionId: session.id,
        customerPhone: session.customer_phone,
        credentials,
      });
      processed += 1;
    } catch (err) {
      console.error(`Error contestando la conversación de WhatsApp ${session.id}:`, err);
    }
  }

  return NextResponse.json({ processed, found: due.length });
}
