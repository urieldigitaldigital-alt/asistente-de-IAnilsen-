import { z } from "zod";

// ---------------------------------------------------------------------------
// Tools de VAPI (payloads no confiables recibidos por el webhook)
// ---------------------------------------------------------------------------

// El modelo casi nunca manda un offset/"Z" aunque se le pida ISO 8601 completo
// (manda algo como "2026-08-23T15:00:00"), así que aceptamos fecha/hora local
// con o sin offset — se interpreta como hora de la clínica en parseLocalDateTime.
const flexibleDatetime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/, "Fecha/hora inválida");

export const checkAvailabilitySchema = z.object({
  treatment: z.string().optional(),
  datetime: flexibleDatetime.optional(),
  durationMinutes: z.number().positive().optional(),
  daysAhead: z.number().int().min(1).max(30).optional(),
});

export const bookAppointmentSchema = z.object({
  datetime: flexibleDatetime,
  durationMinutes: z.number().positive(),
  patientName: z.string().min(1),
  patientPhone: z.string().min(1),
  patientEmail: z.string().email().optional(),
  treatment: z.string().min(1),
  isNewPatient: z.boolean(),
  notes: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  eventId: z.string().optional(),
  patientName: z.string().optional(),
  patientPhone: z.string().optional(),
  datetime: flexibleDatetime.optional(),
});

export const requestHumanHandoffSchema = z.object({
  reason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Personalización (formularios del panel)
// ---------------------------------------------------------------------------

export const dayHoursSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .nullable();

export const businessHoursSchema = z.object({
  monday: dayHoursSchema.optional(),
  tuesday: dayHoursSchema.optional(),
  wednesday: dayHoursSchema.optional(),
  thursday: dayHoursSchema.optional(),
  friday: dayHoursSchema.optional(),
  saturday: dayHoursSchema.optional(),
  sunday: dayHoursSchema.optional(),
});

export const clinicServiceSchema = z.object({
  name: z.string().min(1),
  duration_minutes: z.number().int().positive(),
  description: z.string().optional(),
});

export const clinicInfoSchema = z.object({
  policies: z.string().optional(),
  paymentMethods: z.array(z.string()).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

export const agentConfigFormSchema = z.object({
  system_prompt: z.string(),
  tone: z.string(),
  clinic_info: clinicInfoSchema,
  services: z.array(clinicServiceSchema),
  business_hours: businessHoursSchema,
  voice: z.object({
    provider: z.string(),
    voiceId: z.string(),
    speed: z.number().min(0.5).max(2).optional(),
    model: z.string().optional(),
  }),
  language: z.string(),
  model: z.object({ provider: z.string(), model: z.string() }),
  first_message: z.string(),
  handoff_message: z.string().optional(),
});

const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const clinicDetailsSchema = z.object({
  name: z.string().min(1),
  // VAPI usa este número como destino de la tool nativa transferCall, que exige
  // formato E.164 (+ código de país). Se valida aquí para fallar al guardar,
  // con un mensaje claro, en vez de fallar más tarde al publicar en VAPI.
  phone: z
    .string()
    .optional()
    .refine((value) => !value || E164_PHONE_REGEX.test(value), {
      message: "El teléfono debe estar en formato internacional E.164, ej. +18397379225 (con + y código de país, sin espacios ni guiones).",
    }),
  address: z.string().optional(),
  timezone: z.string().min(1),
});

export const vapiPhoneNumberFormSchema = z.object({
  phoneNumberId: z.string().uuid(),
});

export const twilioImportFormSchema = z.object({
  number: z.string().regex(E164_PHONE_REGEX, "El número debe estar en formato E.164, ej. +5491122334455."),
  twilioAccountSid: z.string().regex(/^AC[a-zA-Z0-9]{32}$/, "Account SID de Twilio inválido (empieza con 'AC')."),
  twilioAuthToken: z.string().min(20, "Auth Token de Twilio inválido."),
});

// ---------------------------------------------------------------------------
// VAPI webhook envelope
// ---------------------------------------------------------------------------

export const vapiToolCallSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  arguments: z.record(z.string(), z.unknown()).optional(),
  function: z
    .object({
      name: z.string(),
      arguments: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    })
    .optional(),
});

export const vapiWebhookMessageSchema = z.object({
  message: z.object({
    type: z.string(),
    call: z
      .object({
        id: z.string().optional(),
        phoneNumberId: z.string().optional(),
        assistantId: z.string().optional(),
        customer: z.object({ number: z.string().optional() }).optional(),
      })
      .optional(),
    toolCallList: z.array(vapiToolCallSchema).optional(),
    toolCalls: z.array(vapiToolCallSchema).optional(),
    endedReason: z.string().optional(),
    artifact: z
      .object({
        transcript: z.string().optional(),
        messages: z
          .array(
            z.object({
              role: z.string().optional(),
              message: z.string().optional(),
            })
          )
          .optional(),
      })
      .optional(),
    analysis: z
      .object({
        summary: z.string().optional(),
      })
      .optional(),
    cost: z.number().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
  }),
});
