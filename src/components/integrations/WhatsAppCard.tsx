"use client";

import { CheckCircleIcon, WarningCircleIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { useActionState } from "react";

import { saveWhatsappCredentialsAction, type WhatsappActionState } from "@/actions/whatsapp";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: WhatsappActionState = { error: null, success: null };

export function WhatsAppCard({ connected, assistantId }: { connected: boolean; assistantId: string | null }) {
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
        El mismo asistente que atiende llamadas responde automáticamente los mensajes de WhatsApp (agenda, consulta y
        cancela citas igual que por teléfono). Necesitás un número de WhatsApp habilitado en Twilio — mirá la guía de arriba.
      </p>

      <form action={formAction} className="space-y-2">
        <div>
          <Label htmlFor="whatsappNumber">Tu número de WhatsApp (formato internacional)</Label>
          <Input id="whatsappNumber" name="whatsappNumber" placeholder="+5491122334455" required />
        </div>
        <div>
          <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
          <Input id="twilioAccountSid" name="twilioAccountSid" placeholder="AC..." autoComplete="off" required />
        </div>
        <div>
          <Label htmlFor="twilioAuthToken">Twilio Auth Token</Label>
          <Input id="twilioAuthToken" name="twilioAuthToken" type="password" autoComplete="off" required />
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
