import type { Metadata } from "next";

import { GoogleCalendarCard } from "@/components/integrations/GoogleCalendarCard";
import { IntegrationsGuide } from "@/components/integrations/IntegrationsGuide";
import { WhatsAppCard } from "@/components/integrations/WhatsAppCard";
import { createClient } from "@/lib/supabase/server";
import { getWhatsappCredentialsSummary } from "@/lib/whatsapp/credentials";
import { getMetaSetupStatus } from "@/lib/whatsapp/metaSetup";

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

  const [{ data: googleCred }, whatsappSummary] = await Promise.all([
    supabase.from("google_credentials").select("clinic_id").eq("clinic_id", clinic.id).maybeSingle(),
    getWhatsappCredentialsSummary(clinic.id, supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integraciones</h1>
        <p className="text-sm text-muted">Conectá WhatsApp y Google Calendar.</p>
      </div>

      <IntegrationsGuide />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WhatsAppCard connected={Boolean(whatsappSummary)} metaSetup={getMetaSetupStatus()} initialValues={whatsappSummary} />
        <GoogleCalendarCard connected={Boolean(googleCred)} error={google_error} />
      </div>
    </div>
  );
}
