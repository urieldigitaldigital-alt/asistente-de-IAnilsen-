"use client";

import { CaretDownIcon, CheckCircleIcon, PhoneIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import {
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
}: {
  assistantId: string | null;
  phoneNumberId: string | null;
  phoneNumber: string | null;
}) {
  const [provisionState, provisionAction, provisionPending] = useActionState(provisionVapiNumberAction, idleState);
  const [linkState, linkAction, linkPending] = useActionState(linkPhoneNumberAction, idleState);
  const [publishState, publishAction, publishPending] = useActionState(publishAssistantAction, idleState);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

      {!assistantId && (
        <p className="text-sm text-muted">
          Publica el asistente desde Personalización antes de obtener un número.
        </p>
      )}

      {!phoneNumberId ? (
        <form action={provisionAction}>
          <Button type="submit" disabled={provisionPending || !assistantId} className="w-full">
            {provisionPending ? "Obteniendo número…" : "Obtener número automáticamente"}
          </Button>
          {provisionState.error && <p className="mt-2 text-sm text-danger">{provisionState.error}</p>}
          {provisionState.success && <p className="mt-2 text-sm text-primary">{provisionState.success}</p>}
          <p className="mt-2 text-xs text-muted">
            Crea y vincula un número al instante, sin salir de este panel. Ideal para empezar a probar ya mismo.
          </p>
        </form>
      ) : (
        <form action={provisionAction}>
          <Button type="submit" variant="secondary" disabled={provisionPending} className="w-full">
            {provisionPending ? "Obteniendo…" : "Obtener otro número"}
          </Button>
          {provisionState.error && <p className="mt-2 text-sm text-danger">{provisionState.error}</p>}
          {provisionState.success && <p className="mt-2 text-sm text-primary">{provisionState.success}</p>}
        </form>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <CaretDownIcon size={12} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          Ya tengo mi propio número (Twilio, etc.)
        </button>
        {showAdvanced && (
          <form action={linkAction} className="mt-2 space-y-2">
            <Label htmlFor="phoneNumberId">UUID del número en VAPI</Label>
            <div className="flex gap-2">
              <Input id="phoneNumberId" name="phoneNumberId" placeholder="00000000-0000-0000-0000-000000000000" required />
              <Button type="submit" variant="secondary" disabled={linkPending || !assistantId}>
                {linkPending ? "Vinculando…" : "Vincular"}
              </Button>
            </div>
            {linkState.error && <p className="text-sm text-danger">{linkState.error}</p>}
            {linkState.success && <p className="text-sm text-primary">{linkState.success}</p>}
            <p className="text-xs text-muted">
              Para usar un número propio (ej. un número argentino importado desde Twilio), impórtalo primero en el dashboard de
              VAPI y pegá aquí su UUID (no el +54...).
            </p>
          </form>
        )}
      </div>

      <form action={publishAction}>
        <Button type="submit" variant="ghost" disabled={publishPending}>
          {publishPending ? "Sincronizando…" : "Sincronizar ahora con VAPI"}
        </Button>
        {publishState.error && <p className="mt-1 text-sm text-danger">{publishState.error}</p>}
        {publishState.success && <p className="mt-1 text-sm text-primary">{publishState.success}</p>}
      </form>
    </Card>
  );
}
