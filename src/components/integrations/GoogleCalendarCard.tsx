import { CalendarBlankIcon, CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { disconnectGoogleAction } from "@/actions/google";
import { Card } from "@/components/ui/Card";

export function GoogleCalendarCard({ connected, error }: { connected: boolean; error?: string }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarBlankIcon size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Google Calendar</h2>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          No se pudo conectar Google Calendar ({error}). Intenta de nuevo.
        </p>
      )}

      {connected ? (
        <>
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon size={16} weight="fill" /> Conectado
          </p>
          <form action={disconnectGoogleAction}>
            <button type="submit" className="text-sm font-medium text-danger hover:underline">
              Desconectar
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Conecta Google Calendar para que el asistente consulte disponibilidad y cree citas automáticamente.
          </p>
          <a
            href="/api/google/auth"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Conectar con Google
          </a>
        </>
      )}
    </Card>
  );
}
