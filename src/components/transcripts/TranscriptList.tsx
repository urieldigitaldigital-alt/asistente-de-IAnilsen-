import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CallListItem } from "@/lib/transcriptsData";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function TranscriptList({ calls }: { calls: CallListItem[] }) {
  if (calls.length === 0) {
    return (
      <EmptyState
        icon={ChatCircleTextIcon}
        title="No hay llamadas que coincidan"
        description="Ajusta la búsqueda o los filtros, o espera a que entren nuevas llamadas."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {calls.map((call) => (
        <li key={call.id}>
          <Link
            href={`/transcripciones/${call.id}`}
            className="flex items-center justify-between gap-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{call.phoneNumber ?? "Número desconocido"}</p>
              <p className="truncate text-xs text-muted">{call.summary ?? "Sin resumen todavía"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-muted">{formatWhen(call.when)}</span>
              {call.hasAppointment && <Badge tone="success">Generó cita</Badge>}
              {call.status && <Badge tone="neutral">{call.status}</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
