import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantVapiClient } from "@/lib/vapi/credentials";
import { getOrCreateWhatsappSession, sendChatMessage } from "@/lib/whatsapp/chat";
import { getWhatsappCredentialsByNumber } from "@/lib/whatsapp/credentials";
import { sendWhatsAppMessage, verifyTwilioSignature } from "@/lib/whatsapp/twilio";

function stripWhatsappPrefix(address: string): string {
  return address.replace(/^whatsapp:/, "");
}

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL no está configurada.");
  return url.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const formParams: Record<string, string> = {};
  formData.forEach((value, key) => {
    formParams[key] = String(value);
  });

  const from = formParams.From; // "whatsapp:+549..."
  const to = formParams.To; // "whatsapp:+1..."
  const body = formParams.Body ?? "";
  if (!from || !to) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const whatsappNumber = stripWhatsappPrefix(to);
  const credentials = await getWhatsappCredentialsByNumber(whatsappNumber, admin);
  if (!credentials) {
    // Número no vinculado a ningún negocio — no hay a quién responder.
    return NextResponse.json({}, { status: 200 });
  }

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const isValid = verifyTwilioSignature({
    authToken: credentials.twilioAuthToken,
    url: `${getAppUrl()}/api/whatsapp/webhook`,
    formParams,
    signature,
  });
  if (!isValid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }

  const customerPhone = stripWhatsappPrefix(from);

  const sendFallback = (text: string) =>
    sendWhatsAppMessage({
      accountSid: credentials.twilioAccountSid,
      authToken: credentials.twilioAuthToken,
      from: whatsappNumber,
      to: customerPhone,
      body: text,
    }).catch((err) => console.error("Error enviando WhatsApp de fallback:", err));

  const { data: config } = await admin
    .from("agent_configs")
    .select("vapi_assistant_id")
    .eq("clinic_id", credentials.clinicId)
    .maybeSingle();

  if (!config?.vapi_assistant_id) {
    await sendFallback("Gracias por tu mensaje. El asistente todavía no está activo, en breve te contactamos.");
    return NextResponse.json({}, { status: 200 });
  }

  try {
    const vapi = await getTenantVapiClient(credentials.clinicId, admin);

    const sessionId = await getOrCreateWhatsappSession({
      clinicId: credentials.clinicId,
      customerPhone,
      assistantId: config.vapi_assistant_id,
      vapi,
      admin,
    });

    const reply = await sendChatMessage({ vapi, assistantId: config.vapi_assistant_id, sessionId, input: body });

    await sendWhatsAppMessage({
      accountSid: credentials.twilioAccountSid,
      authToken: credentials.twilioAuthToken,
      from: whatsappNumber,
      to: customerPhone,
      body: reply ?? "Gracias por tu mensaje. En breve te contestamos.",
    });
  } catch (err) {
    console.error("Error procesando mensaje de WhatsApp:", err);
    await sendFallback("Estamos teniendo un problema técnico. En breve te contesta alguien del equipo.");
  }

  return NextResponse.json({}, { status: 200 });
}
