import { formatLocal } from "@/lib/availability";
import type { AgentConfig, BusinessHours, Clinic, ClinicService } from "@/types/database";

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const WEEKDAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function formatBusinessHours(hours: BusinessHours): string {
  const lines = WEEKDAY_ORDER.map((day) => {
    const range = hours[day as keyof BusinessHours];
    const label = WEEKDAY_LABELS[day];
    return range ? `- ${label}: ${range.start} a ${range.end}` : `- ${label}: cerrado`;
  });
  return lines.join("\n");
}

function todayIsoDate(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
}

function formatServices(services: ClinicService[]): string {
  if (services.length === 0) return "- (sin tratamientos configurados)";
  return services
    .map((service) => `- ${service.name} (${service.duration_minutes} min)${service.description ? `: ${service.description}` : ""}`)
    .join("\n");
}

/**
 * Compone el system prompt final: el texto editable por el dueño en
 * Personalización (identidad, tono, guardrails) + un contexto estructurado
 * generado a partir de los datos de la clínica, siempre sincronizado.
 */
export function buildSystemPrompt(clinic: Clinic, config: AgentConfig): string {
  const sections: (string | null)[] = [
    config.system_prompt.trim() ||
      `Eres el asistente virtual de ${clinic.name}. Ayudas a los pacientes a agendar, consultar y cancelar citas, y respondes dudas frecuentes sobre la clínica.`,
    "",
    `Fecha y hora actuales en la clínica: ${formatLocal(new Date(), clinic.timezone)} (${todayIsoDate(clinic.timezone)}). Usa siempre este año real al calcular cualquier fecha para las tools — nunca un año de otra época.`,
    "",
    "## Contexto de la clínica",
    `Nombre: ${clinic.name}`,
    clinic.address ? `Dirección: ${clinic.address}` : null,
    clinic.phone ? `Teléfono de recepción: ${clinic.phone}` : null,
    config.clinic_info.paymentMethods?.length
      ? `Formas de pago: ${config.clinic_info.paymentMethods.join(", ")}`
      : null,
    "",
    "## Tratamientos disponibles (usa el nombre exacto y la duración al llamar a las tools)",
    formatServices(config.services),
    "",
    "## Horario de atención",
    formatBusinessHours(config.business_hours),
    config.clinic_info.policies ? `\n## Políticas\n${config.clinic_info.policies}` : null,
    config.clinic_info.faq?.length
      ? `\n## Preguntas frecuentes\n${config.clinic_info.faq.map((item) => `- P: ${item.question}\n  R: ${item.answer}`).join("\n")}`
      : null,
    "",
    "## Flujo de la llamada",
    [
      "1. Identifícate como el asistente virtual de la clínica.",
      "2. Si el paciente quiere agendar, pregunta el tratamiento o motivo, y la fecha/hora deseadas.",
      "3. Llama a checkAvailability antes de prometer cualquier horario. Si no está disponible, ofrece las alternativas devueltas.",
      "4. Captura nombre completo, teléfono, correo (opcional) y si es paciente nuevo.",
      "5. Confirma en voz alta todos los datos antes de llamar a bookAppointment, y confirma de nuevo al finalizar.",
      "6. Respeta siempre el horario de atención y los tratamientos configurados.",
      "7. Responde preguntas frecuentes usando getClinicInfo o el contexto de arriba.",
      "8. Si el paciente pide hablar con una persona, o hay una urgencia que no puedas resolver, usa la transferencia a recepción o registra un handoff.",
    ].join("\n"),
    "",
    `Idioma de la conversación: ${config.language === "es" ? "español" : config.language}. Tono: ${config.tone}.`,
  ];

  return sections.filter((line): line is string => line !== null).join("\n");
}

export function buildFirstMessage(config: AgentConfig, clinic: Clinic): string {
  return (
    config.first_message?.trim() ||
    `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿le gustaría agendar una cita?`
  );
}
