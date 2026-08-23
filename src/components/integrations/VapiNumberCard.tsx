"use client";

import { CheckCircleIcon, PhoneIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState } from "react";

import { linkPhoneNumberAction, publishAssistantAction, type VapiActionState } from "@/actions/vapi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: VapiActionState = { error: null, success: null };

export function VapiNumberCard({
  assistantId,
  phoneNumberId,
}: {
  assistantId: string | null;
  phoneNumberId: string | null;
}) {
  const [linkState, linkAction, linkPending] = useActionState(linkPhoneNumberAction, idleState);
  const [publishState, publishAction, publishPending] = useActionState(publishAssistantAction, idleState);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <PhoneIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Asistente y número de VAPI</h2>
      </div>

      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-1.5">
          {assistantId ? (
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
          )}
          Asistente: {assistantId ? <span className="font-mono text-xs">{assistantId}</span> : "no publicado"}
        </p>
        <p className="flex items-center gap-1.5">
          {phoneNumberId ? (
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
          )}
          Número: {phoneNumberId ? <span className="font-mono text-xs">{phoneNumberId}</span> : "no vinculado"}
        </p>
      </div>

      {!assistantId && (
        <p className="text-sm text-muted">
          Publica el asistente desde Personalización antes de vincular un número.
        </p>
      )}

      <form action={linkAction} className="space-y-2">
        <Label htmlFor="phoneNumberId">UUID del número de VAPI</Label>
        <div className="flex gap-2">
          <Input id="phoneNumberId" name="phoneNumberId" placeholder="00000000-0000-0000-0000-000000000000" required />
          <Button type="submit" variant="secondary" disabled={linkPending || !assistantId}>
            {linkPending ? "Vinculando…" : "Vincular"}
          </Button>
        </div>
        {linkState.error && <p className="text-sm text-danger">{linkState.error}</p>}
        {linkState.success && <p className="text-sm text-primary">{linkState.success}</p>}
        <p className="text-xs text-muted">
          Crea el número en el dashboard de VAPI y pega aquí su UUID (no el +52...).
        </p>
      </form>

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
