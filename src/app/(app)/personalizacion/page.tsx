import type { Metadata } from "next";

import { AgentConfigForm } from "@/components/customize/AgentConfigForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Personalización — Asistente Nilsen IA" };

export default async function CustomizePage() {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("*").single();
  if (!clinic) return null;

  const { data: config } = await supabase.from("agent_configs").select("*").eq("clinic_id", clinic.id).single();
  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Personalización</h1>
        <p className="text-sm text-muted">
          Edita el prompt, la información del negocio y la configuración del agente de voz.
        </p>
      </div>
      <AgentConfigForm clinic={clinic} config={config} />
    </div>
  );
}
