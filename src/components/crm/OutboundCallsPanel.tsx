"use client";

import { CheckCircleIcon, PhoneOutgoingIcon } from "@phosphor-icons/react";
import { useActionState } from "react";

import { launchOutboundCallsAction, type LaunchOutboundCallsState } from "@/actions/outboundCalls";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const idleState: LaunchOutboundCallsState = { campaignId: null, leadsCalled: 0, error: null };

export function OutboundCallsPanel() {
  const [state, formAction, pending] = useActionState(launchOutboundCallsAction, idleState);

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <PhoneOutgoingIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Llamadas salientes</h2>
      </div>
      <p className="text-sm text-muted">
        Pegá una lista de números (uno por línea) y el asistente los llama automáticamente para presentarse. Usalo solo con
        gente que ya tiene relación con vos o dio su consentimiento — leads propios, clientes existentes, gente que pidió que
        la llamen. No lo uses para llamar en frío a desconocidos sacados de un directorio: además de ser mala práctica, puede
        infringir la Ley 26.951 (Registro No Llame) y otras normas de telemarketing.
      </p>

      <form action={formAction} className="space-y-2">
        <textarea
          name="numbers"
          rows={6}
          required
          placeholder={"+5491122334455\nJuana Pérez, +5491133445566\n+5491144556677, Carlos"}
          className="w-full rounded-lg border border-border bg-background p-3 font-mono text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted">
          Formato: un número por línea, en internacional (+código de país). Podés agregar el nombre separado por coma, en
          cualquier orden. Máximo 25 por tanda.
        </p>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Iniciando campaña…" : "Llamar a la lista"}
        </Button>
      </form>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      {state.campaignId && (
        <p className="flex items-center gap-1.5 text-sm">
          <CheckCircleIcon size={16} weight="fill" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          Campaña iniciada: {state.leadsCalled} {state.leadsCalled === 1 ? "llamada programada" : "llamadas programadas"}. VAPI
          las va disparando según el límite de líneas simultáneas de tu cuenta.
        </p>
      )}
    </Card>
  );
}
