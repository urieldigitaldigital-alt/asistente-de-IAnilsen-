"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { WhatsappConversationStatus } from "@/types/database";
import { friendlyVapiError } from "@/lib/vapi/friendlyError";
import { saveWhatsappCredentials } from "@/lib/whatsapp/credentials";
import { updateConversationStatus } from "@/lib/whatsapp/messages";
import { whatsappCredentialsFormSchema } from "@/lib/validation";

export interface WhatsappActionState {
  error: string | null;
  success: string | null;
}

export async function saveWhatsappCredentialsAction(
  _prevState: WhatsappActionState,
  formData: FormData
): Promise<WhatsappActionState> {
  const parsed = whatsappCredentialsFormSchema.safeParse({
    whatsappNumber: formData.get("whatsappNumber"),
    twilioAccountSid: formData.get("twilioAccountSid"),
    twilioAuthToken: formData.get("twilioAuthToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", success: null };
  }

  try {
    await saveWhatsappCredentials(parsed.data);
    revalidatePath("/integraciones");
    return { error: null, success: "WhatsApp conectado." };
  } catch (err) {
    console.error("Error guardando las credenciales de WhatsApp.");
    return { error: friendlyVapiError(err, "No se pudo conectar WhatsApp."), success: null };
  }
}

export async function updateWhatsappStatusAction(sessionId: string, status: WhatsappConversationStatus): Promise<void> {
  const supabase = await createClient();
  await updateConversationStatus(supabase, sessionId, status);
  revalidatePath("/whatsapp");
}
