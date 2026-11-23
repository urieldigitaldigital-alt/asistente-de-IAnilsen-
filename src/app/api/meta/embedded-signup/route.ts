import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { saveEmbeddedSignupCredentials } from "@/lib/whatsapp/credentials";
import {
  exchangeEmbeddedSignupCode,
  fetchPhoneNumberDisplay,
  generateTwoStepPin,
  registerPhoneNumber,
  subscribeWabaToApp,
} from "@/lib/whatsapp/meta";

interface EmbeddedSignupBody {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
}

/** Recibe el resultado del botón "Conectar con Facebook" (Embedded Signup) y termina de conectar WhatsApp: cambia el code por un token, suscribe el webhook, registra el número y guarda todo cifrado. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as EmbeddedSignupBody | null;
  const { code, wabaId, phoneNumberId, businessId } = body ?? {};
  if (!code || !wabaId || !phoneNumberId || !businessId) {
    return NextResponse.json({ error: "Faltan datos de Meta." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) {
    return NextResponse.json({ error: "No se encontró el negocio del usuario." }, { status: 404 });
  }

  try {
    const accessToken = await exchangeEmbeddedSignupCode(code);
    await subscribeWabaToApp(wabaId, accessToken);
    const whatsappNumber = await fetchPhoneNumberDisplay(phoneNumberId, accessToken);
    const twoStepPin = generateTwoStepPin();
    await registerPhoneNumber(phoneNumberId, accessToken, twoStepPin);
    await saveEmbeddedSignupCredentials(supabase, {
      clinicId: clinic.id,
      wabaId,
      businessId,
      phoneNumberId,
      whatsappNumber,
      accessToken,
      twoStepPin,
    });
    return NextResponse.json({ whatsappNumber });
  } catch (err) {
    console.error("Error en Embedded Signup de Meta:", err);
    const message = err instanceof Error ? err.message : "No se pudo completar la conexión con Meta.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
