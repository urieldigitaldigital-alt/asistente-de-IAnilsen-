"use server";

import { revalidatePath } from "next/cache";

import { friendlyRetellError } from "@/lib/retell/friendlyError";
import { saveRetellApiKey } from "@/lib/retell/credentials";
import { linkRetellPhoneNumber, provisionRetellNumber, syncAgent } from "@/lib/retell/sync";
import { retellApiKeyFormSchema, retellPhoneNumberFormSchema } from "@/lib/validation";

export interface RetellActionState {
  error: string | null;
  success: string | null;
}

export async function saveRetellApiKeyAction(
  _prevState: RetellActionState,
  formData: FormData
): Promise<RetellActionState> {
  const parsed = retellApiKeyFormSchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Clave de API inválida.", success: null };
  }

  try {
    await saveRetellApiKey(parsed.data.apiKey);
    revalidatePath("/integraciones");
    revalidatePath("/personalizacion");
    return { error: null, success: "Cuenta de Retell conectada." };
  } catch (err) {
    console.error("Error guardando la clave de Retell del negocio.");
    return { error: friendlyRetellError(err, "No se pudo guardar la clave de Retell."), success: null };
  }
}

export async function publishAgentAction(
  _prevState: RetellActionState,
  _formData: FormData
): Promise<RetellActionState> {
  try {
    const result = await syncAgent();
    revalidatePath("/personalizacion");
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: result.created ? "Asistente creado y publicado en Retell." : "Configuración sincronizada con Retell.",
    };
  } catch (err) {
    console.error("Error publicando el asistente en Retell:", err);
    return { error: friendlyRetellError(err, "No se pudo publicar el asistente."), success: null };
  }
}

export async function provisionRetellNumberAction(
  _prevState: RetellActionState,
  _formData: FormData
): Promise<RetellActionState> {
  try {
    const result = await provisionRetellNumber();
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return { error: null, success: `Número obtenido: ${result.phoneNumber}` };
  } catch (err) {
    console.error("Error obteniendo un número de Retell:", err);
    return { error: friendlyRetellError(err, "No se pudo obtener el número."), success: null };
  }
}

export async function linkRetellPhoneNumberAction(
  _prevState: RetellActionState,
  formData: FormData
): Promise<RetellActionState> {
  const parsed = retellPhoneNumberFormSchema.safeParse({ phoneNumber: formData.get("phoneNumber") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ingresá un número en formato E.164 válido.", success: null };
  }

  try {
    await linkRetellPhoneNumber(parsed.data.phoneNumber);
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return { error: null, success: "Número vinculado al asistente." };
  } catch (err) {
    console.error("Error vinculando el número de Retell:", err);
    return { error: friendlyRetellError(err, "No se pudo vincular el número."), success: null };
  }
}
