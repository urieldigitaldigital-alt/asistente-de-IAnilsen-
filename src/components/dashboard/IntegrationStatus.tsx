import { CalendarBlankIcon, CheckCircleIcon, PhoneIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Card } from "@/components/ui/Card";

function Row({
  icon: IconComponent,
  label,
  connected,
  connectedLabel,
  disconnectedLabel,
}: {
  icon: typeof CalendarBlankIcon;
  label: string;
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconComponent size={18} className="text-muted" />
      <span className="flex-1 text-sm">{label}</span>
      <span className={`flex items-center gap-1.5 text-sm font-medium ${connected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
        {connected ? <CheckCircleIcon size={16} weight="fill" /> : <WarningCircleIcon size={16} weight="fill" />}
        {connected ? connectedLabel : disconnectedLabel}
      </span>
    </div>
  );
}

export function IntegrationStatus({
  googleConnected,
  vapiAssistantId,
  vapiPhoneNumberId,
}: {
  googleConnected: boolean;
  vapiAssistantId: string | null;
  vapiPhoneNumberId: string | null;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Estado de integraciones</h2>
      <Row
        icon={CalendarBlankIcon}
        label="Google Calendar"
        connected={googleConnected}
        connectedLabel="Conectado"
        disconnectedLabel="No conectado"
      />
      <Row
        icon={PhoneIcon}
        label="Asistente y número de VAPI"
        connected={Boolean(vapiAssistantId && vapiPhoneNumberId)}
        connectedLabel="Provisionado"
        disconnectedLabel="Pendiente de publicar"
      />
      <Link href="/integraciones" className="block text-sm font-medium text-primary hover:underline">
        Ir a Integraciones →
      </Link>
    </Card>
  );
}
