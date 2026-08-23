"use server";

import { revalidatePath } from "next/cache";

import { importTwilioNumber, linkPhoneNumber, provisionVapiNumber, syncAssistant } from "@/lib/vapi/sync";
import { twilioImportFormSchema, vapiPhoneNumberFormSchema } from "@/lib/validation";

export interface VapiActionState {
  error: string | null;
  success: string | null;
}

export async function publishAssistantAction(
  _prevState: VapiActionState,
  _formData: FormData
): Promise<VapiActionState> {
  try {
    const result = await syncAssistant();
    revalidatePath("/personalizacion");
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: result.created ? "Asistente creado y publicado en VAPI." : "Configuración sincronizada con VAPI.",
    };
  } catch (err) {
    console.error("Error publicando el asistente en VAPI:", err);
    return { error: err instanceof Error ? err.message : "No se pudo publicar el asistente.", success: null };
  }
}

export async function provisionVapiNumberAction(
  _prevState: VapiActionState,
  _formData: FormData
): Promise<VapiActionState> {
  try {
    const result = await provisionVapiNumber();
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: result.number
        ? `Número obtenido: ${result.number}`
        : "Número obtenido y vinculado. Puede tardar unos segundos en activarse — recarga la página si todavía no ves el número.",
    };
  } catch (err) {
    console.error("Error obteniendo un número de VAPI:", err);
    return { error: err instanceof Error ? err.message : "No se pudo obtener el número.", success: null };
  }
}

export async function importTwilioNumberAction(
  _prevState: VapiActionState,
  formData: FormData
): Promise<VapiActionState> {
  const parsed = twilioImportFormSchema.safeParse({
    number: formData.get("number"),
    twilioAccountSid: formData.get("twilioAccountSid"),
    twilioAuthToken: formData.get("twilioAuthToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos de Twilio inválidos.", success: null };
  }

  try {
    const result = await importTwilioNumber(parsed.data);
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: result.number ? `Número de Twilio importado: ${result.number}` : "Número de Twilio importado y vinculado.",
    };
  } catch (err) {
    // No loguear `err` completo si pudiera incluir el auth token en el mensaje de VAPI.
    console.error("Error importando número de Twilio a VAPI.");
    return { error: err instanceof Error ? err.message : "No se pudo importar el número de Twilio.", success: null };
  }
}

export async function linkPhoneNumberAction(
  _prevState: VapiActionState,
  formData: FormData
): Promise<VapiActionState> {
  const parsed = vapiPhoneNumberFormSchema.safeParse({ phoneNumberId: formData.get("phoneNumberId") });
  if (!parsed.success) {
    return { error: "Ingresa un UUID de número de VAPI válido.", success: null };
  }

  try {
    await linkPhoneNumber(parsed.data.phoneNumberId);
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return { error: null, success: "Número vinculado al asistente." };
  } catch (err) {
    console.error("Error vinculando el número de VAPI:", err);
    return { error: err instanceof Error ? err.message : "No se pudo vincular el número.", success: null };
  }
}
