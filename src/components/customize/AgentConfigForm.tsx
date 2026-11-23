"use client";

import { useActionState, useMemo, useState } from "react";

import { saveAgentConfigAction, type AgentConfigActionState } from "@/actions/agentConfig";
import { BusinessHoursEditor } from "@/components/customize/BusinessHoursEditor";
import { ClinicInfoForm } from "@/components/customize/ClinicInfoForm";
import { MenuEditor } from "@/components/customize/MenuEditor";
import { PromptEditor } from "@/components/customize/PromptEditor";
import { SandboxChat } from "@/components/customize/SandboxChat";
import { ServicesEditor } from "@/components/customize/ServicesEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
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
  const [maxAppointmentsPerDay, setMaxAppointmentsPerDay] = useState(
    config.max_appointments_per_day != null ? String(config.max_appointments_per_day) : ""
  );
  const [ownerNotificationPhone, setOwnerNotificationPhone] = useState(config.owner_notification_phone ?? "");
  const [salesClosingEnabled, setSalesClosingEnabled] = useState(config.sales_closing_enabled);
  const [autoFollowUpEnabled, setAutoFollowUpEnabled] = useState(config.auto_follow_up_enabled);
  const [followUpDays, setFollowUpDays] = useState(String(config.follow_up_days));
  const [language] = useState(config.language);

  const [saveState, saveAction, savePending] = useActionState(saveAgentConfigAction, idleState);

  const configJson = useMemo(
    () =>
      JSON.stringify({
        system_prompt: systemPrompt,
        tone,
        clinic_info: { policies, paymentMethods, faq },
        services,
        menu_items: menuItems,
        business_hours: businessHours,
        language,
        first_message: firstMessage,
        handoff_message: handoffMessage,
        max_appointments_per_day: maxAppointmentsPerDay.trim() === "" ? null : Number(maxAppointmentsPerDay),
        owner_notification_phone: ownerNotificationPhone.trim() === "" ? null : ownerNotificationPhone.trim(),
        sales_closing_enabled: salesClosingEnabled,
        auto_follow_up_enabled: autoFollowUpEnabled,
        follow_up_days: followUpDays.trim() === "" ? 2 : Number(followUpDays),
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
      language,
      firstMessage,
      handoffMessage,
      maxAppointmentsPerDay,
      ownerNotificationPhone,
      salesClosingEnabled,
      autoFollowUpEnabled,
      followUpDays,
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

      {businessType === "citas" && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">Tope de citas por día</h2>
          <p className="text-sm text-muted">
            Si lo completás, el asistente no va a agendar más de esta cantidad de llamadas/citas el mismo día — va a
            ofrecer repartirlas en distintos horarios y, si el día ya está completo, va a sugerir otra fecha. Dejalo
            vacío para no limitar.
          </p>
          <div className="max-w-40">
            <Label htmlFor="max_appointments_per_day">Máximo por día</Label>
            <Input
              id="max_appointments_per_day"
              type="number"
              min={1}
              max={100}
              placeholder="Sin límite"
              value={maxAppointmentsPerDay}
              onChange={(e) => setMaxAppointmentsPerDay(e.target.value)}
            />
          </div>
        </Card>
      )}

      {businessType === "citas" && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">Avisos de nuevas citas por WhatsApp</h2>
          <p className="text-sm text-muted">
            Además de la notificación push del navegador, te podemos avisar por WhatsApp al instante cada vez que se
            agende una cita — es más confiable para que te llegue al celular. Completá tu número con código de país
            (ej. +5491122334455) o dejalo vacío para no recibir este aviso.
          </p>
          <div className="max-w-xs">
            <Label htmlFor="owner_notification_phone">Tu WhatsApp</Label>
            <Input
              id="owner_notification_phone"
              type="tel"
              placeholder="+5491122334455"
              value={ownerNotificationPhone}
              onChange={(e) => setOwnerNotificationPhone(e.target.value)}
            />
          </div>
        </Card>
      )}

      {businessType === "citas" && (
        <Card className="space-y-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={salesClosingEnabled}
              onChange={(e) => setSalesClosingEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">Intentar cerrar clientes, no solo agendar llamadas</span>
              <p className="mt-1 text-muted">
                Si lo activás, cuando alguien se muestre muy interesado el asistente va a intentar cerrarlo como
                cliente ahí mismo (en vez de siempre derivar a una llamada) y te va a avisar. Los que no se muestren
                tan interesados siguen yendo al flujo normal de agendar una llamada. Los clientes cerrados aparecen en
                el CRM.
              </p>
            </span>
          </label>
        </Card>
      )}

      <Card className="space-y-2">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={autoFollowUpEnabled}
            onChange={(e) => setAutoFollowUpEnabled(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">Seguimiento automático a quien no contesta</span>
            <p className="mt-1 text-muted">
              Si un cliente deja de responder, el asistente le vuelve a escribir un único mensaje para retomar la
              conversación — no reemplaza tu criterio, se detiene solo si el cliente contesta o si lo marcás como
              &quot;no interesado&quot;.
            </p>
          </span>
        </label>
        {autoFollowUpEnabled && (
          <div className="ml-7 max-w-40">
            <Label htmlFor="follow_up_days">Días sin respuesta antes de escribir de nuevo</Label>
            <Input
              id="follow_up_days"
              type="number"
              min={1}
              max={14}
              value={followUpDays}
              onChange={(e) => setFollowUpDays(e.target.value)}
            />
          </div>
        )}
      </Card>

      <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />

      <SandboxChat systemPrompt={systemPrompt} />

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <form action={saveAction}>
          <input type="hidden" name="config_json" value={configJson} />
          <input type="hidden" name="clinic_json" value={clinicJson} />
          <Button type="submit" disabled={savePending}>
            {savePending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
        <div className="flex-1">
          <StatusMessage state={saveState} />
        </div>
      </div>
    </div>
  );
}
