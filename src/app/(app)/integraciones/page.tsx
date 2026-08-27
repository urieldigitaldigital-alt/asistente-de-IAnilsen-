import type { Metadata } from "next";

import { GoogleCalendarCard } from "@/components/integrations/GoogleCalendarCard";
import { IntegrationsGuide } from "@/components/integrations/IntegrationsGuide";
import { VapiAccountCard } from "@/components/integrations/VapiAccountCard";
import { VapiNumberCard } from "@/components/integrations/VapiNumberCard";
import { WhatsAppCard } from "@/components/integrations/WhatsAppCard";
import { createClient } from "@/lib/supabase/server";
import { hasVapiCredentials } from "@/lib/vapi/credentials";
import { getPhoneNumberDigits } from "@/lib/vapi/sync";
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

  const [{ data: config }, { data: googleCred }, vapiConnected, whatsappSummary] = await Promise.all([
    supabase.from("agent_configs").select("vapi_assistant_id, vapi_phone_number_id").eq("clinic_id", clinic.id).single(),
    supabase.from("google_credentials").select("clinic_id").eq("clinic_id", clinic.id).maybeSingle(),
    hasVapiCredentials(clinic.id, supabase),
    getWhatsappCredentialsSummary(clinic.id, supabase),
  ]);

  const phoneNumber =
    vapiConnected && config?.vapi_phone_number_id
      ? await getPhoneNumberDigits(clinic.id, config.vapi_phone_number_id, supabase)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integraciones</h1>
        <p className="text-sm text-muted">Conecta tu cuenta de VAPI, Google Calendar, tu número de teléfono y WhatsApp.</p>
      </div>

      <IntegrationsGuide />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VapiAccountCard connected={vapiConnected} />
        <GoogleCalendarCard connected={Boolean(googleCred)} error={google_error} />
        <VapiNumberCard
          assistantId={config?.vapi_assistant_id ?? null}
          phoneNumberId={config?.vapi_phone_number_id ?? null}
          phoneNumber={phoneNumber}
          vapiConnected={vapiConnected}
        />
        <WhatsAppCard
          connected={Boolean(whatsappSummary)}
          assistantId={config?.vapi_assistant_id ?? null}
          initialValues={whatsappSummary}
        />
      </div>
    </div>
  );
}
