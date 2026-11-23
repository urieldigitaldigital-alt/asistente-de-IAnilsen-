import { NextResponse, type NextRequest } from "next/server";

import { constantTimeEqual } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnWhatsappCredentials } from "@/lib/whatsapp/credentials";
import { findDueFollowUpSessions, sendFollowUpMessage } from "@/lib/whatsapp/followup";

/**
 * Disparado por un cron (pg_cron + pg_net, cada 6 horas — ver migración
 * 0036) para reengachar conversaciones de WhatsApp donde el cliente dejó de
 * contestar. Nunca se llama desde el navegador ni desde Meta.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  const expected = process.env.WHATSAPP_CRON_SECRET ?? "";
  if (!expected || !constantTimeEqual(secret, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const due = await findDueFollowUpSessions(admin);
  if (due.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const session of due) {
    try {
      const [{ data: clinic }, { data: config }, credentials] = await Promise.all([
        admin.from("clinics").select("*").eq("id", session.clinic_id).single(),
        admin.from("agent_configs").select("*").eq("clinic_id", session.clinic_id).single(),
        getOwnWhatsappCredentials(session.clinic_id, admin),
      ]);
      if (!clinic || !config || !credentials) continue;

      const didSend = await sendFollowUpMessage({ admin, clinic, config, session, credentials });
      if (didSend) sent += 1;
    } catch (err) {
      console.error(`Error mandando el seguimiento de la conversación ${session.id}:`, err);
    }
  }

  return NextResponse.json({ sent, found: due.length });
}
