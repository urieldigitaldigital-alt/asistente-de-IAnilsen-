import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantVapiClient } from "@/lib/vapi/credentials";
import { getOrCreateWhatsappSession, sendChatMessage } from "@/lib/whatsapp/chat";
import { findClinicByVerifyToken, getWhatsappCredentialsByPhoneNumberId } from "@/lib/whatsapp/credentials";
import { logWhatsappMessage } from "@/lib/whatsapp/messages";
import { parseMetaWebhookPayload, sendWhatsAppMessage } from "@/lib/whatsapp/meta";

/** Meta llama a esto una vez, al configurar el webhook en developers.facebook.com, para confirmar que la URL es válida. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const clinicId = await findClinicByVerifyToken(token, admin);
  if (!clinicId) {
    return NextResponse.json({ error: "invalid_verify_token" }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const inbound = parseMetaWebhookPayload(payload);
  if (!inbound) {
    // Meta también manda notificaciones de estado (entregado/leído) sin mensaje — las ignoramos.
    return NextResponse.json({});
  }

  const admin = createAdminClient();
  const credentials = await getWhatsappCredentialsByPhoneNumberId(inbound.phoneNumberId, admin);
  if (!credentials) {
    return NextResponse.json({});
  }

  const sendFallback = (text: string) =>
    sendWhatsAppMessage({
      phoneNumberId: credentials.metaPhoneNumberId,
      accessToken: credentials.metaAccessToken,
      to: inbound.from,
      body: text,
    }).catch((err) => console.error("Error enviando WhatsApp de fallback:", err));

  const { data: config } = await admin
    .from("agent_configs")
    .select("vapi_assistant_id")
    .eq("clinic_id", credentials.clinicId)
    .maybeSingle();

  if (!config?.vapi_assistant_id) {
    await sendFallback("Gracias por tu mensaje. El asistente todavía no está activo, en breve te contactamos.");
    return NextResponse.json({});
  }

  try {
    const vapi = await getTenantVapiClient(credentials.clinicId, admin);

    const conversation = await getOrCreateWhatsappSession({
      clinicId: credentials.clinicId,
      customerPhone: inbound.from,
      assistantId: config.vapi_assistant_id,
      vapi,
      admin,
    });

    await logWhatsappMessage(admin, {
      clinicId: credentials.clinicId,
      sessionId: conversation.id,
      role: "customer",
      body: inbound.body,
    });

    const reply = await sendChatMessage({
      vapi,
      assistantId: config.vapi_assistant_id,
      sessionId: conversation.vapiSessionId,
      input: inbound.body,
    });
    const replyText = reply ?? "Gracias por tu mensaje. En breve te contestamos.";

    await logWhatsappMessage(admin, {
      clinicId: credentials.clinicId,
      sessionId: conversation.id,
      role: "assistant",
      body: replyText,
    });

    await sendWhatsAppMessage({
      phoneNumberId: credentials.metaPhoneNumberId,
      accessToken: credentials.metaAccessToken,
      to: inbound.from,
      body: replyText,
    });
  } catch (err) {
    console.error("Error procesando mensaje de WhatsApp:", err);
    await sendFallback("Estamos teniendo un problema técnico. En breve te contesta alguien del equipo.");
  }

  return NextResponse.json({});
}
