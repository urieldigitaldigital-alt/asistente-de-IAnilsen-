export type CallStatusTone = "neutral" | "success" | "warning" | "danger";

/**
 * VAPI guarda en `calls.status` el motivo técnico de fin de llamada tal cual
 * (ej. "call.in-progress.error-providerfault-outbound-sip-503-service-unavailable"),
 * pensado para debug, no para mostrarlo directo al dueño del negocio — acá
 * se traduce a algo legible y con el color que corresponde.
 */
export function formatCallStatus(status: string): { label: string; tone: CallStatusTone } {
  const s = status.toLowerCase();
  if (s.includes("error") || s.includes("failed")) return { label: "Error de conexión", tone: "danger" };
  if (s.includes("did-not-answer") || s.includes("no-answer")) return { label: "No atendió", tone: "warning" };
  if (s.includes("busy")) return { label: "Ocupado", tone: "warning" };
  if (s.includes("voicemail")) return { label: "Buzón de voz", tone: "neutral" };
  if (s.includes("silence-timed-out")) return { label: "Sin respuesta", tone: "warning" };
  if (s.includes("ended-call") || s === "ended") return { label: "Finalizada", tone: "success" };
  return { label: "Finalizada", tone: "neutral" };
}
