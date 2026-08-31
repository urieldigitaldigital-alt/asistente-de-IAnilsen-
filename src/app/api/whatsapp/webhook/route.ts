import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
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

  const [{ data: clinic }, { data: config }] = await Promise.all([
    admin.from("clinics").select("*").eq("id", credentials.clinicId).single(),
    admin.from("agent_configs").select("*").eq("clinic_id", credentials.clinicId).single(),
  ]);

  if (!clinic || !config) {
    await sendFallback("Gracias por tu mensaje. En breve te contactamos.");
    return NextResponse.json({});
  }

  // Meta reintenta la entrega del webhook si no respondemos rápido (o en
  // reentregas duplicadas más raras) — sin este chequeo, un reintento podía
  // procesar el mismo mensaje dos veces y, si justo era la confirmación de
  // un pedido, crear dos pedidos idénticos.
  if (inbound.waMessageId) {
    const { data: existing } = await admin
      .from("whatsapp_messages")
      .select("id")
      .eq("wa_message_id", inbound.waMessageId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({});
    }
  }

  try {
    const conversation = await getOrCreateWhatsappSession({
      clinicId: credentials.clinicId,
      customerPhone: inbound.from,
      admin,
    });

    const { duplicate } = await logWhatsappMessage(admin, {
      clinicId: credentials.clinicId,
      sessionId: conversation.id,
      role: "customer",
      body: inbound.body,
      waMessageId: inbound.waMessageId,
    });
    // Última línea de defensa: si dos entregas casi simultáneas del mismo
    // webhook pasaron el chequeo de arriba antes de que ninguna insertara,
    // el índice único de wa_message_id hace fallar la segunda acá.
    if (duplicate) {
      return NextResponse.json({});
    }

    const reply = await sendChatMessage({
      admin,
      clinic,
      config,
      sessionId: conversation.id,
      customerPhone: inbound.from,
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
