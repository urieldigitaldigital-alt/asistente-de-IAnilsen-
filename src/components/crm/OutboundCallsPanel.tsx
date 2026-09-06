"use client";

import { CheckCircleIcon, PhoneOutgoingIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef } from "react";

import { addOutboundCallAction, type AddOutboundCallState } from "@/actions/outboundCalls";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const idleState: AddOutboundCallState = { history: [], formError: null };

export function OutboundCallsPanel() {
  const [state, formAction, pending] = useActionState(addOutboundCallAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);

  // Cada llamada exitosa limpia el formulario para cargar el próximo contacto enseguida.
  useEffect(() => {
    if (!pending) formRef.current?.reset();
  }, [state, pending]);

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <PhoneOutgoingIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Llamadas salientes</h2>
      </div>
      <p className="text-sm text-muted">
        Cargá un contacto y el asistente lo llama al toque para presentarse. Usalo solo con gente que ya tiene relación con
        vos o dio su consentimiento — leads propios, clientes existentes, gente que pidió que la llamen. No lo uses para
        llamar en frío a desconocidos sacados de un directorio: además de ser mala práctica, puede infringir la Ley 26.951
        (Registro No Llame) y otras normas de telemarketing.
      </p>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" placeholder="+5491122334455" required />
        </div>
        <div className="flex-1">
          <Label htmlFor="name">Nombre (opcional)</Label>
          <Input id="name" name="name" placeholder="Juana Pérez" />
        </div>
        <Button type="submit" disabled={pending} className="sm:w-auto">
          {pending ? "Llamando…" : "Agregar y llamar"}
        </Button>
      </form>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      {state.history.length > 0 && (
        <ul className="space-y-1 text-sm">
          {state.history
            .slice()
            .reverse()
            .map((entry, index) => (
              <li key={`${entry.phone}-${state.history.length - index}`} className="flex items-center gap-1.5">
                {entry.ok ? (
                  <CheckCircleIcon size={16} weight="fill" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <WarningCircleIcon size={16} weight="fill" className="shrink-0 text-danger" />
                )}
                <span className="font-medium">{entry.name || entry.phone}</span>
                {entry.name && <span className="text-muted">{entry.phone}</span>}
                {!entry.ok && <span className="text-danger">— {entry.error}</span>}
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
