"use client";

import { CheckCircleIcon, KeyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState } from "react";

import { saveVapiApiKeyAction, type VapiActionState } from "@/actions/vapi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: VapiActionState = { error: null, success: null };

export function VapiAccountCard({ connected }: { connected: boolean }) {
  const [state, formAction, pending] = useActionState(saveVapiApiKeyAction, idleState);

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <KeyIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Tu cuenta de VAPI</h2>
      </div>

      <p className="flex items-center gap-1.5 text-sm">
        {connected ? (
          <>
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
            Conectada
          </>
        ) : (
          <>
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
            No conectada
          </>
        )}
      </p>

      <p className="text-sm text-muted">
        Cada negocio usa su propia cuenta de VAPI: así vos administrás y pagás únicamente tu propio consumo de llamadas,
        independiente del resto.
      </p>
      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted">
        <li>
          Creá una cuenta gratis en{" "}
          <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
            vapi.ai
          </a>
        </li>
        <li>Andá a Settings → API Keys</li>
        <li>Copiá la &quot;Private Key&quot;</li>
      </ol>

      <form action={formAction} className="space-y-2">
        <Label htmlFor="apiKey">Clave de API (Private Key) de VAPI</Label>
        <div className="flex gap-2">
          <Input id="apiKey" name="apiKey" type="password" autoComplete="off" placeholder="00000000-0000-0000-0000-000000000000" required />
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : connected ? "Actualizar" : "Conectar"}
          </Button>
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-primary">{state.success}</p>}
      </form>
    </Card>
  );
}
