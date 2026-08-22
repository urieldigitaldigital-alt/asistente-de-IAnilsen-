import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CallDetail } from "@/lib/transcriptsData";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const minutes = (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
  return `${minutes.toFixed(1)} min`;
}

export function TranscriptDetail({ detail }: { detail: CallDetail }) {
  const { call, transcriptTurns, fullTranscript, appointment } = detail;

  return (
    <div className="space-y-6">
      <Card className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted">Teléfono</p>
          <p className="font-medium">{call.phone_number ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted">Fecha</p>
          <p className="font-medium">{formatDateTime(call.started_at ?? call.created_at)}</p>
        </div>
        <div>
          <p className="text-muted">Duración</p>
          <p className="font-medium">{formatDuration(call.started_at, call.ended_at)}</p>
        </div>
        <div>
          <p className="text-muted">Costo</p>
          <p className="font-medium">{call.cost != null ? `$${call.cost.toFixed(2)}` : "—"}</p>
        </div>
      </Card>

      {call.summary && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Resumen</h2>
          <p className="text-sm text-muted">{call.summary}</p>
        </Card>
      )}

      {appointment && (
        <Card>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Cita generada</h2>
            <Badge tone={appointment.status === "cancelled" ? "danger" : "success"}>{appointment.status}</Badge>
          </div>
          <p className="text-sm text-muted">
            {appointment.patient_name} — {appointment.treatment} — {formatDateTime(appointment.start_time)}
          </p>
          <Link href="/calendario" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Ver en Calendario →
          </Link>
        </Card>
      )}

      {call.recording_url && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Grabación</h2>
          <audio controls src={call.recording_url} className="w-full" />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Conversación</h2>
        {transcriptTurns.length > 0 ? (
          <ol className="space-y-3">
            {transcriptTurns.map((turn) => (
              <li key={turn.id} className={`flex ${turn.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    turn.role === "assistant" ? "bg-black/5 dark:bg-white/10" : "bg-primary/10"
                  }`}
                >
                  <p className="mb-0.5 text-[11px] font-medium text-muted">
                    {turn.role === "assistant" ? "Asistente" : "Paciente"}
                  </p>
                  {turn.text}
                </div>
              </li>
            ))}
          </ol>
        ) : fullTranscript ? (
          <p className="whitespace-pre-line text-sm">{fullTranscript}</p>
        ) : (
          <p className="text-sm text-muted">La transcripción aún no está disponible para esta llamada.</p>
        )}
      </Card>
    </div>
  );
}
