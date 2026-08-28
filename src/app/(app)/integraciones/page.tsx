import type { Metadata } from "next";

import { GoogleCalendarCard } from "@/components/integrations/GoogleCalendarCard";
import { IntegrationsGuide } from "@/components/integrations/IntegrationsGuide";
import { RetellAccountCard } from "@/components/integrations/RetellAccountCard";
import { RetellNumberCard } from "@/components/integrations/RetellNumberCard";
import { WhatsAppCard } from "@/components/integrations/WhatsAppCard";
import { hasRetellCredentials } from "@/lib/retell/credentials";
import { createClient } from "@/lib/supabase/server";
import { getWhatsappCredentialsSummary } from "@/lib/whatsapp/credentials";

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

  const [{ data: config }, { data: googleCred }, retellConnected, whatsappSummary] = await Promise.all([
    supabase.from("agent_configs").select("retell_agent_id, retell_phone_number").eq("clinic_id", clinic.id).single(),
    supabase.from("google_credentials").select("clinic_id").eq("clinic_id", clinic.id).maybeSingle(),
    hasRetellCredentials(clinic.id, supabase),
    getWhatsappCredentialsSummary(clinic.id, supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integraciones</h1>
        <p className="text-sm text-muted">Conecta tu cuenta de Retell, Google Calendar, tu número de teléfono y WhatsApp.</p>
      </div>

      <IntegrationsGuide />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RetellAccountCard connected={retellConnected} />
        <GoogleCalendarCard connected={Boolean(googleCred)} error={google_error} />
        <RetellNumberCard
          agentId={config?.retell_agent_id ?? null}
          phoneNumber={config?.retell_phone_number ?? null}
          retellConnected={retellConnected}
        />
        <WhatsAppCard
          connected={Boolean(whatsappSummary)}
          agentId={config?.retell_agent_id ?? null}
          initialValues={whatsappSummary}
        />
      </div>
    </div>
  );
}
