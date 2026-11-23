"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { agentConfigFormSchema, clinicDetailsSchema } from "@/lib/validation";

export interface AgentConfigActionState {
  error: string | null;
  success: string | null;
}

export async function saveAgentConfigAction(
  _prevState: AgentConfigActionState,
  formData: FormData
): Promise<AgentConfigActionState> {
  const rawConfig = formData.get("config_json");
  const rawClinic = formData.get("clinic_json");
  if (typeof rawConfig !== "string" || typeof rawClinic !== "string") {
    return { error: "Formulario inválido.", success: null };
  }

  let configInput: unknown;
  let clinicInput: unknown;
  try {
    configInput = JSON.parse(rawConfig);
    clinicInput = JSON.parse(rawClinic);
  } catch {
    return { error: "No se pudo leer el formulario.", success: null };
  }

  const configParsed = agentConfigFormSchema.safeParse(configInput);
  const clinicParsed = clinicDetailsSchema.safeParse(clinicInput);
  if (!configParsed.success || !clinicParsed.success) {
    const firstIssue = clinicParsed.error?.issues[0] ?? configParsed.error?.issues[0];
    return { error: firstIssue?.message ?? "Revisa los campos del formulario, hay datos inválidos.", success: null };
  }

  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return { error: "No se encontró tu negocio.", success: null };

  const { error: clinicError } = await supabase.from("clinics").update(clinicParsed.data).eq("id", clinic.id);
  if (clinicError) return { error: clinicError.message, success: null };

  const { error: configError } = await supabase
    .from("agent_configs")
    .update(configParsed.data)
    .eq("clinic_id", clinic.id);
  if (configError) return { error: configError.message, success: null };

  revalidatePath("/personalizacion");
  revalidatePath("/dashboard");
  return { error: null, success: "Cambios guardados." };
}
