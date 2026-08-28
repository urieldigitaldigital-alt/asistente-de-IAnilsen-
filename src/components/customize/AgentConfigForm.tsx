"use client";

import { useActionState, useMemo, useState } from "react";

import { saveAgentConfigAction, saveAndPublishAgentConfigAction, type AgentConfigActionState } from "@/actions/agentConfig";
import { BusinessHoursEditor } from "@/components/customize/BusinessHoursEditor";
import { ClinicInfoForm } from "@/components/customize/ClinicInfoForm";
import { MenuEditor } from "@/components/customize/MenuEditor";
import { PromptEditor } from "@/components/customize/PromptEditor";
import { SandboxChat } from "@/components/customize/SandboxChat";
import { ServicesEditor } from "@/components/customize/ServicesEditor";
import { VoiceLanguageSelect } from "@/components/customize/VoiceLanguageSelect";
import { Button } from "@/components/ui/Button";
import type { AgentConfig, BusinessHours, BusinessType, Clinic, ClinicService, MenuItem } from "@/types/database";

const idleState: AgentConfigActionState = { error: null, success: null };

function StatusMessage({ state }: { state: AgentConfigActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${
        state.error ? "border border-danger/30 bg-danger/10 text-danger" : "border border-primary/30 bg-primary/10 text-primary"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

export function AgentConfigForm({ clinic, config }: { clinic: Clinic; config: AgentConfig }) {
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt);
  const [tone, setTone] = useState(config.tone);
  const [firstMessage, setFirstMessage] = useState(config.first_message);
  const [handoffMessage, setHandoffMessage] = useState(config.handoff_message ?? "");

  const [clinicName, setClinicName] = useState(clinic.name);
  const [businessType, setBusinessType] = useState<BusinessType>(clinic.business_type);
  const [clinicPhone, setClinicPhone] = useState(clinic.phone ?? "");
  const [clinicAddress, setClinicAddress] = useState(clinic.address ?? "");
  const [timezone, setTimezone] = useState(clinic.timezone);

  const [policies, setPolicies] = useState(config.clinic_info.policies ?? "");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(config.clinic_info.paymentMethods ?? []);
  const [faq, setFaq] = useState(config.clinic_info.faq ?? []);

  const [services, setServices] = useState<ClinicService[]>(config.services);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(config.menu_items ?? []);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(config.business_hours);

  const [voiceProvider, setVoiceProvider] = useState(config.voice.provider || "azure");
  const [voiceId, setVoiceId] = useState(config.voice.voiceId || "es-MX-DaliaNeural");
  const [speed, setSpeed] = useState(config.voice.speed ?? 1.15);
  const [language, setLanguage] = useState(config.language);
  const [modelName, setModelName] = useState(config.model.model || "gpt-4.1");

  const [saveState, saveAction, savePending] = useActionState(saveAgentConfigAction, idleState);
  const [publishState, publishAction, publishPending] = useActionState(saveAndPublishAgentConfigAction, idleState);

  const configJson = useMemo(
    () =>
      JSON.stringify({
        system_prompt: systemPrompt,
        tone,
        clinic_info: { policies, paymentMethods, faq },
        services,
        menu_items: menuItems,
        business_hours: businessHours,
        voice: { provider: voiceProvider, voiceId, speed },
        language,
        model: { provider: "openai", model: modelName },
        first_message: firstMessage,
        handoff_message: handoffMessage,
      }),
    [
      systemPrompt,
      tone,
      policies,
      paymentMethods,
      faq,
      services,
      menuItems,
      businessHours,
      voiceProvider,
      voiceId,
      speed,
      language,
      modelName,
      firstMessage,
      handoffMessage,
    ]
  );

  const clinicJson = useMemo(
    () => JSON.stringify({ name: clinicName, business_type: businessType, phone: clinicPhone, address: clinicAddress, timezone }),
    [clinicName, businessType, clinicPhone, clinicAddress, timezone]
  );

  return (
    <div className="space-y-6">
      <PromptEditor
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        tone={tone}
        onToneChange={setTone}
        firstMessage={firstMessage}
        onFirstMessageChange={setFirstMessage}
        handoffMessage={handoffMessage}
        onHandoffMessageChange={setHandoffMessage}
      />

      <ClinicInfoForm
        clinicName={clinicName}
        onClinicNameChange={setClinicName}
        businessType={businessType}
        onBusinessTypeChange={setBusinessType}
        clinicPhone={clinicPhone}
        onClinicPhoneChange={setClinicPhone}
        clinicAddress={clinicAddress}
        onClinicAddressChange={setClinicAddress}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        policies={policies}
        onPoliciesChange={setPolicies}
        paymentMethods={paymentMethods}
        onPaymentMethodsChange={setPaymentMethods}
        faq={faq}
        onFaqChange={setFaq}
      />

      {businessType === "pedidos" || businessType === "restaurante" ? (
        <MenuEditor menuItems={menuItems} onChange={setMenuItems} />
      ) : businessType === "citas" ? (
        <ServicesEditor services={services} onChange={setServices} />
      ) : null}
      <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />
      <VoiceLanguageSelect
        voiceProvider={voiceProvider}
        onVoiceProviderChange={setVoiceProvider}
        voiceId={voiceId}
        onVoiceIdChange={setVoiceId}
        speed={speed}
        onSpeedChange={setSpeed}
        language={language}
        onLanguageChange={setLanguage}
        modelName={modelName}
        onModelNameChange={setModelName}
      />

      <SandboxChat systemPrompt={systemPrompt} modelName={modelName} />

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <form action={saveAction}>
          <input type="hidden" name="config_json" value={configJson} />
          <input type="hidden" name="clinic_json" value={clinicJson} />
          <Button type="submit" variant="secondary" disabled={savePending || publishPending}>
            {savePending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
        <form action={publishAction}>
          <input type="hidden" name="config_json" value={configJson} />
          <input type="hidden" name="clinic_json" value={clinicJson} />
          <Button type="submit" disabled={savePending || publishPending}>
            {publishPending ? "Publicando…" : "Publicar"}
          </Button>
        </form>
        <div className="flex-1">
          <StatusMessage state={saveState.error || saveState.success ? saveState : publishState} />
        </div>
      </div>
    </div>
  );
}
