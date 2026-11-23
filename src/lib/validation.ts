import { z } from "zod";

// ---------------------------------------------------------------------------
// Tools del asistente (payloads no confiables generados por el modelo)
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

// El modelo a veces corta la captura del teléfono a mitad de camino (ej. solo
// el código de área). Exigir un mínimo de dígitos evita guardar un número a
// medias — el mensaje le indica al modelo que le pida el resto al cliente.
const phoneSchema = z
  .string()
  .min(1)
  .refine((value) => value.replace(/\D/g, "").length >= 8, {
    message: "El teléfono parece incompleto. Pedile al cliente que te repita el número completo, dígito por dígito.",
  });

export const bookAppointmentSchema = z.object({
  datetime: flexibleDatetime,
  durationMinutes: z.number().positive(),
  patientName: z.string().min(1),
  patientPhone: phoneSchema,
  patientEmail: z.string().email().optional(),
  treatment: z.string().min(1),
  isNewPatient: z.boolean(),
  notes: z.string().optional(),
});

export const closeClientSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: phoneSchema,
  service: z.string().min(1),
  notes: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  eventId: z.string().optional(),
  patientName: z.string().optional(),
  patientPhone: phoneSchema.optional(),
  datetime: flexibleDatetime.optional(),
});

export const requestHumanHandoffSchema = z.object({
  reason: z.string().optional(),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        notes: z.string().optional(),
      })
    )
    .min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  orderType: z.enum(["pickup", "delivery"]),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const reserveTableSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  partySize: z.number().int().positive(),
  reservationTime: flexibleDatetime,
  notes: z.string().optional(),
});

export const getPropertiesSchema = z.object({
  maxPrice: z.number().positive().optional(),
});

export const scheduleVisitSchema = z.object({
  propertyId: z.string().min(1),
  visitTime: flexibleDatetime,
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  notes: z.string().optional(),
});

export const logInquirySchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().min(1),
  reason: z.string().min(1),
});

export const updateLeadInterestSchema = z.object({
  level: z.enum(["interesado", "no_interesado"]),
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

export const menuItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const propertyFormSchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  price: z.number().nonnegative(),
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
  menu_items: z.array(menuItemSchema),
  business_hours: businessHoursSchema,
  language: z.string(),
  first_message: z.string(),
  handoff_message: z.string().optional(),
  max_appointments_per_day: z.number().int().min(1).max(100).nullable().optional(),
  owner_notification_phone: z
    .string()
    .nullable()
    .optional()
    .refine((value) => !value || E164_PHONE_REGEX.test(value), {
      message: "El WhatsApp para avisos debe tener formato internacional (ej. +5491122334455).",
    }),
  sales_closing_enabled: z.boolean().optional(),
  auto_follow_up_enabled: z.boolean().optional(),
  follow_up_days: z.number().int().min(1).max(14).optional(),
});

const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const clinicDetailsSchema = z.object({
  name: z.string().min(1),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || E164_PHONE_REGEX.test(value), {
      message: "El teléfono debe estar en formato internacional E.164, ej. +18397379225 (con + y código de país, sin espacios ni guiones).",
    }),
  address: z.string().optional(),
  timezone: z.string().min(1),
  business_type: z.enum(["citas", "pedidos", "restaurante", "inmobiliaria", "llamadas"]),
});

export const whatsappCredentialsFormSchema = z.object({
  whatsappNumber: z.string().regex(E164_PHONE_REGEX, "El número debe estar en formato E.164, ej. +5491122334455."),
  metaPhoneNumberId: z.string().min(5, "Phone Number ID de Meta inválido."),
  // Vacío = "no cambiar" al actualizar (ver saveWhatsappCredentials); solo se exige largo mínimo si viene algo.
  metaAccessToken: z.string().refine((v) => v === "" || v.length >= 20, "Access Token de Meta inválido."),
  metaVerifyToken: z.string().min(4, "Elegí un Verify Token de al menos 4 caracteres."),
});

export const whatsappReplySchema = z.object({
  body: z.string().trim().min(1, "Escribí un mensaje.").max(4096, "El mensaje es demasiado largo."),
});
