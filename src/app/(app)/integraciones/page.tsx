import type { Metadata } from "next";

import { GoogleCalendarCard } from "@/components/integrations/GoogleCalendarCard";
import { VapiNumberCard } from "@/components/integrations/VapiNumberCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Integraciones — Asistente Nilsen IA" };

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string; google_connected?: string }>;
}) {
  const { google_error } = await searchParams;

  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return null;

  const [{ data: config }, { data: googleCred }] = await Promise.all([
    supabase.from("agent_configs").select("vapi_assistant_id, vapi_phone_number_id").eq("clinic_id", clinic.id).single(),
    supabase.from("google_credentials").select("clinic_id").eq("clinic_id", clinic.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integraciones</h1>
        <p className="text-sm text-muted">Conecta Google Calendar y vincula el número telefónico de VAPI.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GoogleCalendarCard connected={Boolean(googleCred)} error={google_error} />
        <VapiNumberCard
          assistantId={config?.vapi_assistant_id ?? null}
          phoneNumberId={config?.vapi_phone_number_id ?? null}
        />
      </div>
    </div>
  );
}
