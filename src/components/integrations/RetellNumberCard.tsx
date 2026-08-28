"use client";

import { CaretDownIcon, CheckCircleIcon, PhoneIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import { linkRetellPhoneNumberAction, provisionRetellNumberAction, publishAgentAction, type RetellActionState } from "@/actions/retell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: RetellActionState = { error: null, success: null };

export function RetellNumberCard({
  agentId,
  phoneNumber,
  retellConnected,
}: {
  agentId: string | null;
  phoneNumber: string | null;
  retellConnected: boolean;
}) {
  const [provisionState, provisionAction, provisionPending] = useActionState(provisionRetellNumberAction, idleState);
  const [linkState, linkAction, linkPending] = useActionState(linkRetellPhoneNumberAction, idleState);
  const [publishState, publishAction, publishPending] = useActionState(publishAgentAction, idleState);
  const [showLink, setShowLink] = useState(false);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <PhoneIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Asistente y número de teléfono</h2>
      </div>

      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-1.5">
          {agentId ? (
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
          )}
          Asistente: {agentId ? "publicado" : "no publicado"}
        </p>
        <p className="flex items-center gap-1.5">
          {phoneNumber ? (
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
          )}
          Número: {phoneNumber ?? "no vinculado"}
        </p>
      </div>

      {!retellConnected && (
        <p className="text-sm text-muted">Conectá tu cuenta de Retell arriba antes de publicar el asistente.</p>
      )}
      {retellConnected && !agentId && (
        <p className="text-sm text-muted">
          Publica el asistente desde Personalización antes de obtener un número.
        </p>
      )}

      {!phoneNumber && (
        <form action={provisionAction}>
          <Button type="submit" disabled={provisionPending || !agentId || !retellConnected} className="w-full">
            {provisionPending ? "Obteniendo número…" : "Obtener número automáticamente (EE.UU.)"}
          </Button>
          {provisionState.error && <p className="mt-2 text-sm text-danger">{provisionState.error}</p>}
          {provisionState.success && <p className="mt-2 text-sm text-primary">{provisionState.success}</p>}
          <p className="mt-2 text-xs text-muted">
            Crea y vincula un número al instante, sin salir de este panel. Retell solo asigna números de EE.UU. — para un
            número de Argentina, importalo por SIP trunk desde el dashboard de Retell y pegalo abajo.
          </p>
        </form>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowLink((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <CaretDownIcon size={12} className={`transition-transform ${showLink ? "rotate-180" : ""}`} />
          Ya tengo un número en Retell (ej. importado por SIP)
        </button>
        {showLink && (
          <form action={linkAction} className="mt-2 space-y-2">
            <Label htmlFor="phoneNumber">Número (formato internacional)</Label>
            <div className="flex gap-2">
              <Input id="phoneNumber" name="phoneNumber" placeholder="+5491122334455" required />
              <Button type="submit" variant="secondary" disabled={linkPending || !agentId || !retellConnected}>
                {linkPending ? "Vinculando…" : "Vincular"}
              </Button>
            </div>
            {linkState.error && <p className="text-sm text-danger">{linkState.error}</p>}
            {linkState.success && <p className="text-sm text-primary">{linkState.success}</p>}
          </form>
        )}
      </div>

      <form action={publishAction}>
        <Button type="submit" variant="ghost" disabled={publishPending || !retellConnected}>
          {publishPending ? "Sincronizando…" : "Sincronizar ahora con Retell"}
        </Button>
        {publishState.error && <p className="mt-1 text-sm text-danger">{publishState.error}</p>}
        {publishState.success && <p className="mt-1 text-sm text-primary">{publishState.success}</p>}
      </form>
    </Card>
  );
}
