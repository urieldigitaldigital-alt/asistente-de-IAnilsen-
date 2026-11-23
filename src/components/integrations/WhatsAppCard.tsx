"use client";

import { ArrowClockwiseIcon, CheckCircleIcon, WarningCircleIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  saveWhatsappCredentialsAction,
  testWhatsappConnectionAction,
  type WhatsappActionState,
} from "@/actions/whatsapp";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { MetaEmbeddedSignupButton } from "@/components/integrations/MetaEmbeddedSignupButton";
import type { WhatsappConnectionMethod } from "@/types/database";

const idleState: WhatsappActionState = { error: null, success: null };

export function WhatsAppCard({
  connected,
  metaSetup,
  initialValues,
}: {
  connected: boolean;
  /** Config de la plataforma para el flujo de un clic. `missing` solo se muestra en el detalle para el administrador. */
  metaSetup: { ready: boolean; missing: string[] };
  initialValues: {
    whatsappNumber: string;
    metaPhoneNumberId: string;
    metaVerifyToken: string | null;
    connectionMethod: WhatsappConnectionMethod;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(saveWhatsappCredentialsAction, idleState);
  const [testResult, setTestResult] = useState<WhatsappActionState>(idleState);
  const [testing, startTest] = useTransition();
  const router = useRouter();

  const whatsappDigits = initialValues?.whatsappNumber.replace(/[^\d]/g, "") ?? "";

  function handleTest() {
    setTestResult(idleState);
    startTest(async () => {
      setTestResult(await testWhatsappConnectionAction());
    });
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <WhatsappLogoIcon size={20} weight="fill" className="text-primary" />
        <h2 className="text-sm font-semibold">WhatsApp</h2>
      </div>

      <p className="flex items-center gap-1.5 text-sm">
        {connected ? (
          <>
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
            Conectado{initialValues?.connectionMethod === "oauth" ? " con Facebook" : ""}
            {initialValues ? `: ${initialValues.whatsappNumber}` : ""}
          </>
        ) : (
          <>
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
            No conectado
          </>
        )}
      </p>

      <p className="text-sm text-muted">El asistente responde automáticamente los mensajes de WhatsApp.</p>

      {connected ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
              {testing ? "Probando…" : "Probar ahora"}
            </Button>
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                Escribirle desde mi celular
              </a>
            )}
          </div>
          {testResult.success && (
            <p className="flex items-start gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
              {testResult.success}
            </p>
          )}
          {testResult.error && (
            <div className="space-y-2">
              <p className="flex items-start gap-1.5 text-sm text-danger">
                <WarningCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
                {testResult.error}
              </p>
              {metaSetup.ready && (
                <MetaEmbeddedSignupButton
                  label="Reconectar con Facebook"
                  onConnected={() => {
                    setTestResult(idleState);
                    router.refresh();
                  }}
                />
              )}
            </div>
          )}
          {metaSetup.ready && initialValues?.connectionMethod === "oauth" && !testResult.error && (
            <details className="text-sm">
              <summary className="flex cursor-pointer items-center gap-1 text-muted">
                <ArrowClockwiseIcon size={14} />
                Cambiar de número o reconectar
              </summary>
              <div className="mt-2">
                <MetaEmbeddedSignupButton label="Reconectar con Facebook" onConnected={() => router.refresh()} />
              </div>
            </details>
          )}
        </div>
      ) : metaSetup.ready ? (
        <MetaEmbeddedSignupButton onConnected={() => router.refresh()} />
      ) : (
        <div className="space-y-2">
          <p className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm text-muted dark:bg-white/5">
            La conexión en un clic todavía no está habilitada en esta instalación. Mientras tanto podés conectar WhatsApp a
            mano acá abajo.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted">Para el administrador de la plataforma</summary>
            <p className="mt-1 text-muted">
              Faltan estas variables de entorno: <span className="font-mono">{metaSetup.missing.join(", ")}</span>. Ver la
              sección de Meta en el README.
            </p>
          </details>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">
          {connected ? "Datos de la conexión manual (avanzado)" : "O completá los datos a mano (avanzado)"}
        </summary>
        <form action={formAction} className="mt-3 space-y-2">
          <div>
            <Label htmlFor="whatsappNumber">Número de WhatsApp (el que te dio Meta)</Label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              placeholder="+15551234567"
              defaultValue={initialValues?.whatsappNumber}
              required
            />
          </div>
          <div>
            <Label htmlFor="metaPhoneNumberId">Phone Number ID (de Meta)</Label>
            <Input
              id="metaPhoneNumberId"
              name="metaPhoneNumberId"
              placeholder="123456789012345"
              defaultValue={initialValues?.metaPhoneNumberId}
              required
            />
          </div>
          <div>
            <Label htmlFor="metaAccessToken">
              Access Token (de Meta){connected ? " — dejalo en blanco si no cambió" : ""}
            </Label>
            <Input id="metaAccessToken" name="metaAccessToken" type="password" autoComplete="off" required={!connected} />
            {connected && (
              <p className="mt-1 text-xs text-muted">Por seguridad no mostramos el token guardado — completalo solo si lo renovaste.</p>
            )}
          </div>
          <div>
            <Label htmlFor="metaVerifyToken">Verify Token (inventá uno, ej. &quot;asistente2026&quot;)</Label>
            <Input
              id="metaVerifyToken"
              name="metaVerifyToken"
              autoComplete="off"
              placeholder="asistente2026"
              defaultValue={initialValues?.metaVerifyToken ?? ""}
              required
            />
            <p className="mt-1 text-xs text-muted">
              Este valor lo elegís vos — usá el mismo texto acá y en el webhook de Meta.
            </p>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando…" : connected ? "Actualizar" : "Conectar manualmente"}
          </Button>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-primary">{state.success}</p>}
        </form>
      </details>
    </Card>
  );
}
