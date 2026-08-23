"use client";

import { CaretDownIcon, CheckCircleIcon, PhoneIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import {
  importTwilioNumberAction,
  linkPhoneNumberAction,
  provisionVapiNumberAction,
  publishAssistantAction,
  type VapiActionState,
} from "@/actions/vapi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: VapiActionState = { error: null, success: null };

export function VapiNumberCard({
  assistantId,
  phoneNumberId,
  phoneNumber,
  vapiConnected,
}: {
  assistantId: string | null;
  phoneNumberId: string | null;
  phoneNumber: string | null;
  vapiConnected: boolean;
}) {
  const [provisionState, provisionAction, provisionPending] = useActionState(provisionVapiNumberAction, idleState);
  const [twilioState, twilioAction, twilioPending] = useActionState(importTwilioNumberAction, idleState);
  const [linkState, linkAction, linkPending] = useActionState(linkPhoneNumberAction, idleState);
  const [publishState, publishAction, publishPending] = useActionState(publishAssistantAction, idleState);
  const [showTwilio, setShowTwilio] = useState(false);
  const [showRawUuid, setShowRawUuid] = useState(false);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <PhoneIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Asistente y número de teléfono</h2>
      </div>

      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-1.5">
          {assistantId ? (
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
          )}
          Asistente: {assistantId ? "publicado" : "no publicado"}
        </p>
        <p className="flex items-center gap-1.5">
          {phoneNumberId ? (
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
          )}
          Número: {phoneNumberId ? phoneNumber ?? "activándose…" : "no vinculado"}
        </p>
      </div>

      {!vapiConnected && (
        <p className="text-sm text-muted">Conectá tu cuenta de VAPI arriba antes de publicar el asistente.</p>
      )}
      {vapiConnected && !assistantId && (
        <p className="text-sm text-muted">
          Publica el asistente desde Personalización antes de obtener un número.
        </p>
      )}

      <form action={provisionAction}>
        <Button type="submit" disabled={provisionPending || !assistantId || !vapiConnected} className="w-full">
          {provisionPending ? "Obteniendo número…" : phoneNumberId ? "Obtener otro número (EE.UU.)" : "Obtener número automáticamente (EE.UU.)"}
        </Button>
        {provisionState.error && <p className="mt-2 text-sm text-danger">{provisionState.error}</p>}
        {provisionState.success && <p className="mt-2 text-sm text-primary">{provisionState.success}</p>}
        <p className="mt-2 text-xs text-muted">
          Crea y vincula un número al instante, sin salir de este panel. VAPI solo asigna números de EE.UU. — requiere una
          tarjeta cargada en tu cuenta de VAPI (Settings → Billing).
        </p>
      </form>

      <div>
        <button
          type="button"
          onClick={() => setShowTwilio((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <CaretDownIcon size={12} className={`transition-transform ${showTwilio ? "rotate-180" : ""}`} />
          Importar un número propio de Twilio (ej. de Argentina)
        </button>
        {showTwilio && (
          <form action={twilioAction} className="mt-2 space-y-2">
            <div>
              <Label htmlFor="number">Número (formato internacional)</Label>
              <Input id="number" name="number" placeholder="+5491122334455" required />
            </div>
            <div>
              <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
              <Input id="twilioAccountSid" name="twilioAccountSid" placeholder="AC..." autoComplete="off" required />
            </div>
            <div>
              <Label htmlFor="twilioAuthToken">Twilio Auth Token</Label>
              <Input id="twilioAuthToken" name="twilioAuthToken" type="password" autoComplete="off" required />
            </div>
            <Button type="submit" variant="secondary" disabled={twilioPending || !assistantId || !vapiConnected} className="w-full">
              {twilioPending ? "Importando…" : "Importar y vincular"}
            </Button>
            {twilioState.error && <p className="text-sm text-danger">{twilioState.error}</p>}
            {twilioState.success && <p className="text-sm text-primary">{twilioState.success}</p>}
            <p className="text-xs text-muted">
              Comprá el número en{" "}
              <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="underline">
                twilio.com
              </a>{" "}
              y copiá estos 3 datos desde la Consola de Twilio (Account SID y Auth Token están en la página principal). No
              guardamos el Auth Token — se envía directo a VAPI para activar el número.
            </p>
          </form>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowRawUuid((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <CaretDownIcon size={12} className={`transition-transform ${showRawUuid ? "rotate-180" : ""}`} />
          Ya tengo el UUID de un número creado en VAPI
        </button>
        {showRawUuid && (
          <form action={linkAction} className="mt-2 space-y-2">
            <Label htmlFor="phoneNumberId">UUID del número en VAPI</Label>
            <div className="flex gap-2">
              <Input id="phoneNumberId" name="phoneNumberId" placeholder="00000000-0000-0000-0000-000000000000" required />
              <Button type="submit" variant="secondary" disabled={linkPending || !assistantId || !vapiConnected}>
                {linkPending ? "Vinculando…" : "Vincular"}
              </Button>
            </div>
            {linkState.error && <p className="text-sm text-danger">{linkState.error}</p>}
            {linkState.success && <p className="text-sm text-primary">{linkState.success}</p>}
          </form>
        )}
      </div>

      <form action={publishAction}>
        <Button type="submit" variant="ghost" disabled={publishPending || !vapiConnected}>
          {publishPending ? "Sincronizando…" : "Sincronizar ahora con VAPI"}
        </Button>
        {publishState.error && <p className="mt-1 text-sm text-danger">{publishState.error}</p>}
        {publishState.success && <p className="mt-1 text-sm text-primary">{publishState.success}</p>}
      </form>
    </Card>
  );
}
