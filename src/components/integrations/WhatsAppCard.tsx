"use client";

import { CheckCircleIcon, WarningCircleIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { useActionState } from "react";

import { saveWhatsappCredentialsAction, type WhatsappActionState } from "@/actions/whatsapp";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: WhatsappActionState = { error: null, success: null };

export function WhatsAppCard({
  connected,
  assistantId,
  initialValues,
}: {
  connected: boolean;
  assistantId: string | null;
  initialValues: { whatsappNumber: string; metaPhoneNumberId: string; metaVerifyToken: string } | null;
}) {
  const [state, formAction, pending] = useActionState(saveWhatsappCredentialsAction, idleState);

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
            Conectado
          </>
        ) : (
          <>
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 dark:text-amber-400" />
            No conectado
          </>
        )}
      </p>

      {!assistantId && (
        <p className="text-sm text-muted">Publica el asistente desde Personalización antes de conectar WhatsApp.</p>
      )}

      <p className="text-sm text-muted">
        El mismo asistente que atiende llamadas responde automáticamente los mensajes de WhatsApp. Usa un número de prueba
        de Meta (developers.facebook.com) — mirá la guía de arriba para conseguir estos datos.
      </p>

      <form action={formAction} className="space-y-2">
        <div>
          <Label htmlFor="whatsappNumber">Número de WhatsApp (el que te dio Meta)</Label>
          <Input id="whatsappNumber" name="whatsappNumber" placeholder="+15551234567" defaultValue={initialValues?.whatsappNumber} required />
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
            defaultValue={initialValues?.metaVerifyToken}
            required
          />
          <p className="mt-1 text-xs text-muted">
            Este valor lo elegís vos — usá el mismo texto acá y en el webhook de Meta.
          </p>
        </div>
        <Button type="submit" disabled={pending || !assistantId} className="w-full">
          {pending ? "Guardando…" : connected ? "Actualizar" : "Conectar WhatsApp"}
        </Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-primary">{state.success}</p>}
      </form>
    </Card>
  );
}
