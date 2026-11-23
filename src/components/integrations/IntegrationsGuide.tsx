import { CalendarBlankIcon, ListNumbersIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {number}
      </span>
      <div className="text-sm text-muted">
        <span className="font-medium text-foreground">{title}</span> {children}
      </div>
    </div>
  );
}

export function IntegrationsGuide() {
  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-2">
        <ListNumbersIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Guía paso a paso: cómo dejar todo funcionando</h2>
      </div>
      <p className="text-sm text-muted">
        Solo hacen falta estos 2 pasos. No hace falta saber de tecnología.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <WhatsappLogoIcon size={16} weight="fill" className="text-primary" /> 1. Conectá tu WhatsApp
        </div>
        <div className="space-y-2 pl-1">
          <Step number={1} title="En la tarjeta">
            &quot;WhatsApp&quot; de más abajo, tocá &quot;Conectar con Facebook&quot;.
          </Step>
          <Step number={2} title="Elegí o creá tu cuenta de WhatsApp Business">
            en la ventana que se abre, y confirmá el número que querés usar.
          </Step>
          <Step number={3} title="Listo:">
            apenas se cierra la ventana ya quedó conectado — no hace falta copiar ni pegar nada.
          </Step>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarBlankIcon size={16} className="text-primary" /> 2. Conectá Google Calendar
        </div>
        <div className="space-y-2 pl-1">
          <Step number={1} title="En la tarjeta">
            &quot;Google Calendar&quot; de más abajo, tocá &quot;Conectar con Google&quot;.
          </Step>
          <Step number={2} title="Iniciá sesión">
            con la cuenta de Google donde querés que se agenden las citas.
          </Step>
          <Step number={3} title="Aceptá los permisos">
            que te pide Google.
          </Step>
          <Step number={4} title="Listo:">
            va a aparecer &quot;Conectado&quot; en esa tarjeta.
          </Step>
        </div>
      </div>
    </Card>
  );
}
