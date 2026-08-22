import { PhoneIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardRecentCall } from "@/lib/dashboardData";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function RecentCalls({ calls }: { calls: DashboardRecentCall[] }) {
  if (calls.length === 0) {
    return (
      <EmptyState
        icon={PhoneIcon}
        title="Aún no hay llamadas"
        description="Cuando el agente reciba llamadas, aparecerán aquí con acceso directo a su transcripción."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {calls.map((call) => (
        <li key={call.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{call.phoneNumber ?? "Número desconocido"}</p>
            <p className="truncate text-xs text-muted">{call.summary ?? "Sin resumen todavía"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted">{formatWhen(call.when)}</span>
            {call.status && <Badge tone={call.status === "ended" ? "neutral" : "success"}>{call.status}</Badge>}
            <Link href={`/transcripciones/${call.id}`} className="text-xs font-medium text-primary hover:underline">
              Ver transcripción
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
