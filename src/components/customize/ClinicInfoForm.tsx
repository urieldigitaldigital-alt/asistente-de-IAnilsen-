"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

interface FaqItem {
  question: string;
  answer: string;
}

const TIMEZONE_OPTIONS = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Montevideo", label: "Uruguay (Montevideo)" },
  { value: "America/Asuncion", label: "Paraguay (Asunción)" },
  { value: "America/Guayaquil", label: "Ecuador (Guayaquil)" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/La_Paz", label: "Bolivia (La Paz)" },
  { value: "Europe/Madrid", label: "España (Madrid)" },
  { value: "America/New_York", label: "EE.UU. — Este (Nueva York)" },
  { value: "America/Los_Angeles", label: "EE.UU. — Oeste (Los Ángeles)" },
];
const CUSTOM_TIMEZONE_VALUE = "__custom__";

interface ClinicInfoFormProps {
  clinicName: string;
  onClinicNameChange: (value: string) => void;
  businessType: "citas" | "pedidos";
  onBusinessTypeChange: (value: "citas" | "pedidos") => void;
  clinicPhone: string;
  onClinicPhoneChange: (value: string) => void;
  clinicAddress: string;
  onClinicAddressChange: (value: string) => void;
  timezone: string;
  onTimezoneChange: (value: string) => void;
  policies: string;
  onPoliciesChange: (value: string) => void;
  paymentMethods: string[];
  onPaymentMethodsChange: (value: string[]) => void;
  faq: FaqItem[];
  onFaqChange: (value: FaqItem[]) => void;
}

export function ClinicInfoForm({
  clinicName,
  onClinicNameChange,
  businessType,
  onBusinessTypeChange,
  clinicPhone,
  onClinicPhoneChange,
  clinicAddress,
  onClinicAddressChange,
  timezone,
  onTimezoneChange,
  policies,
  onPoliciesChange,
  paymentMethods,
  onPaymentMethodsChange,
  faq,
  onFaqChange,
}: ClinicInfoFormProps) {
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Información del negocio</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clinic_name">Nombre del negocio</Label>
          <Input id="clinic_name" value={clinicName} onChange={(e) => onClinicNameChange(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="business_type">Tipo de negocio</Label>
          <select
            id="business_type"
            value={businessType}
            onChange={(e) => onBusinessTypeChange(e.target.value as "citas" | "pedidos")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="citas">Citas (clínica, salón, consultorio…)</option>
            <option value="pedidos">Pedidos (restaurante, delivery…)</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            Define si el asistente agenda citas o toma pedidos de una carta — cambia el panel y las tools del agente.
          </p>
        </div>
        <div>
          <Label htmlFor="clinic_phone">Teléfono de recepción</Label>
          <Input id="clinic_phone" value={clinicPhone} onChange={(e) => onClinicPhoneChange(e.target.value)} placeholder="+528112345678" />
          <p className="mt-1 text-xs text-muted">
            Formato internacional E.164: + código de país, sin espacios ni guiones. Déjalo vacío si no quieres transferencia a recepción.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="clinic_address">Dirección</Label>
          <Input id="clinic_address" value={clinicAddress} onChange={(e) => onClinicAddressChange(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="timezone">Zona horaria</Label>
          {(() => {
            const isKnown = TIMEZONE_OPTIONS.some((tz) => tz.value === timezone);
            const selectValue = isKnown ? timezone : CUSTOM_TIMEZONE_VALUE;
            return (
              <>
                <select
                  id="timezone"
                  value={selectValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    onTimezoneChange(next === CUSTOM_TIMEZONE_VALUE ? "" : next);
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  <option value={CUSTOM_TIMEZONE_VALUE}>Otra (escribir manualmente)…</option>
                </select>
                {selectValue === CUSTOM_TIMEZONE_VALUE && (
                  <Input
                    className="mt-2"
                    value={timezone}
                    onChange={(e) => onTimezoneChange(e.target.value)}
                    placeholder="America/Mexico_City"
                  />
                )}
              </>
            );
          })()}
          <p className="mt-1 text-xs text-muted">
            Debe ser un identificador IANA válido (ej. America/Argentina/Buenos_Aires) — no alcanza con el nombre del país.
          </p>
        </div>
        <div>
          <Label htmlFor="payment_methods">Formas de pago (separadas por coma)</Label>
          <Input
            id="payment_methods"
            value={paymentMethods.join(", ")}
            onChange={(e) => onPaymentMethodsChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="policies">Políticas</Label>
        <textarea
          id="policies"
          value={policies}
          onChange={(e) => onPoliciesChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Preguntas frecuentes</Label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onFaqChange([...faq, { question: "", answer: "" }])}
          >
            <PlusIcon size={14} /> Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {faq.map((item, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Pregunta"
                  value={item.question}
                  onChange={(e) => {
                    const next = [...faq];
                    next[index] = { ...next[index], question: e.target.value };
                    onFaqChange(next);
                  }}
                />
                <Input
                  placeholder="Respuesta"
                  value={item.answer}
                  onChange={(e) => {
                    const next = [...faq];
                    next[index] = { ...next[index], answer: e.target.value };
                    onFaqChange(next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => onFaqChange(faq.filter((_, i) => i !== index))}
                className="self-start rounded-lg p-2 text-danger hover:bg-danger/10"
                aria-label="Eliminar pregunta"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))}
          {faq.length === 0 && <p className="text-sm text-muted">Sin preguntas frecuentes configuradas.</p>}
        </div>
      </div>
    </Card>
  );
}
