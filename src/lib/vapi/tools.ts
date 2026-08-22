import type { Vapi } from "@vapi-ai/server-sdk";

type OpenAiModelToolsItem = Vapi.OpenAiModelToolsItem;

export const TOOL_NAMES = {
  checkAvailability: "checkAvailability",
  bookAppointment: "bookAppointment",
  cancelAppointment: "cancelAppointment",
  getClinicInfo: "getClinicInfo",
  requestHumanHandoff: "requestHumanHandoff",
} as const;

interface BuildToolsParams {
  receptionPhoneNumber?: string;
}

/**
 * Tools que resuelven contra el webhook del asistente (`model.tools`), más
 * las tools nativas endCall (siempre) y transferCall (solo si la clínica
 * configuró un teléfono de recepción). Ninguna define `server` propio: todas
 * heredan `assistant.server.url` (ver lib/vapi/sync.ts), que es el siguiente
 * nivel de prioridad cuando una tool no trae su propio server.
 * `transferCall` es nativa de Vapi, no debe imitarse con una function tool
 * (ver skill create-tool de Vapi).
 */
export function buildAssistantTools(params: BuildToolsParams = {}): OpenAiModelToolsItem[] {
  const { receptionPhoneNumber } = params;

  const tools: OpenAiModelToolsItem[] = [
    {
      type: "function",
      function: {
        name: TOOL_NAMES.checkAvailability,
        description:
          "Consulta si hay disponibilidad para un tratamiento en una fecha/hora, respetando el horario de atención de la clínica. Si el horario pedido no está libre, devuelve hasta 3 alternativas.",
        parameters: {
          type: "object",
          properties: {
            treatment: { type: "string", description: "Tratamiento solicitado (p. ej. limpieza, revisión, urgencia, ortodoncia)." },
            datetime: { type: "string", description: "Fecha y hora solicitadas en formato ISO 8601." },
            durationMinutes: { type: "number", description: "Duración estimada de la cita en minutos." },
            daysAhead: { type: "number", description: "Días hacia adelante a considerar si no se pide una fecha exacta (1-30)." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: TOOL_NAMES.bookAppointment,
        description: "Agenda una cita confirmada. Llama primero a checkAvailability para confirmar el horario.",
        parameters: {
          type: "object",
          properties: {
            datetime: { type: "string", description: "Fecha y hora de la cita en formato ISO 8601." },
            durationMinutes: { type: "number", description: "Duración de la cita en minutos." },
            patientName: { type: "string", description: "Nombre completo del paciente." },
            patientPhone: { type: "string", description: "Teléfono del paciente." },
            patientEmail: { type: "string", description: "Correo del paciente (opcional)." },
            treatment: { type: "string", description: "Tratamiento a realizar." },
            isNewPatient: { type: "boolean", description: "Si es la primera vez del paciente en la clínica." },
            notes: { type: "string", description: "Notas adicionales (opcional)." },
          },
          required: ["datetime", "durationMinutes", "patientName", "patientPhone", "treatment", "isNewPatient"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: TOOL_NAMES.cancelAppointment,
        description: "Cancela una cita existente, identificada por el paciente y la fecha.",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string", description: "ID del evento de Google Calendar, si se conoce." },
            patientName: { type: "string", description: "Nombre del paciente." },
            patientPhone: { type: "string", description: "Teléfono del paciente." },
            datetime: { type: "string", description: "Fecha y hora aproximadas de la cita a cancelar." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: TOOL_NAMES.getClinicInfo,
        description: "Devuelve información de la clínica (dirección, horarios, formas de pago, políticas) para responder preguntas frecuentes.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: TOOL_NAMES.requestHumanHandoff,
        description: "Registra que la llamada necesita atención humana (además de, o en vez de, transferir la llamada).",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Motivo por el que se requiere atención humana." },
          },
        },
      },
    },
    {
      type: "endCall",
      messages: [{ type: "request-start", content: "Gracias por su llamada, que tenga buen día." }],
    },
  ];

  if (receptionPhoneNumber) {
    tools.push({
      type: "transferCall",
      destinations: [
        {
          type: "number",
          number: receptionPhoneNumber,
          message: "Le comunico con recepción, un momento por favor.",
          description: "Transferir a recepción cuando el paciente lo pida explícitamente o haya una urgencia que el asistente no pueda resolver.",
        },
      ],
    });
  }

  return tools;
}
