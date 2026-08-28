"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { agentConfigFormSchema, clinicDetailsSchema } from "@/lib/validation";
import { syncAssistant } from "@/lib/vapi/sync";

export interface AgentConfigActionState {
  error: string | null;
  success: string | null;
}

async function persistAgentConfig(formData: FormData): Promise<{ error: string | null }> {
  const rawConfig = formData.get("config_json");
  const rawClinic = formData.get("clinic_json");
  if (typeof rawConfig !== "string" || typeof rawClinic !== "string") {
    return { error: "Formulario inválido." };
  }

  let configInput: unknown;
  let clinicInput: unknown;
  try {
    configInput = JSON.parse(rawConfig);
    clinicInput = JSON.parse(rawClinic);
  } catch {
    return { error: "No se pudo leer el formulario." };
  }

  const configParsed = agentConfigFormSchema.safeParse(configInput);
  const clinicParsed = clinicDetailsSchema.safeParse(clinicInput);
  if (!configParsed.success || !clinicParsed.success) {
    const firstIssue = clinicParsed.error?.issues[0] ?? configParsed.error?.issues[0];
    return { error: firstIssue?.message ?? "Revisa los campos del formulario, hay datos inválidos." };
  }

  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return { error: "No se encontró tu clínica." };

  const { error: clinicError } = await supabase.from("clinics").update(clinicParsed.data).eq("id", clinic.id);
  if (clinicError) return { error: clinicError.message };

  const { error: configError } = await supabase
    .from("agent_configs")
    .update(configParsed.data)
    .eq("clinic_id", clinic.id);
  if (configError) return { error: configError.message };

  return { error: null };
}

export async function saveAgentConfigAction(
  _prevState: AgentConfigActionState,
  formData: FormData
): Promise<AgentConfigActionState> {
  const { error } = await persistAgentConfig(formData);
  if (error) return { error, success: null };

  revalidatePath("/personalizacion");
  return { error: null, success: "Cambios guardados. No olvides publicar para sincronizar con VAPI." };
}

export async function saveAndPublishAgentConfigAction(
  _prevState: AgentConfigActionState,
  formData: FormData
): Promise<AgentConfigActionState> {
  const { error } = await persistAgentConfig(formData);
  if (error) return { error, success: null };

  try {
    const result = await syncAssistant();
    revalidatePath("/personalizacion");
    revalidatePath("/integraciones");
    revalidatePath("/dashboard");
    return {
      error: null,
      success: result.created ? "Guardado y asistente creado en VAPI." : "Guardado y publicado en VAPI.",
    };
  } catch (err) {
    console.error("Error publicando el asistente en VAPI:", err);
    revalidatePath("/personalizacion");
    return { error: err instanceof Error ? err.message : "Se guardó, pero no se pudo publicar en VAPI.", success: null };
  }
}
