import type Retell from "retell-sdk";

export const TOOL_NAMES = {
  checkAvailability: "checkAvailability",
  bookAppointment: "bookAppointment",
  cancelAppointment: "cancelAppointment",
  getClinicInfo: "getClinicInfo",
  requestHumanHandoff: "requestHumanHandoff",
  getMenu: "getMenu",
  createOrder: "createOrder",
  reserveTable: "reserveTable",
  getProperties: "getProperties",
  scheduleVisit: "scheduleVisit",
  logInquiry: "logInquiry",
} as const;

export type BusinessType = "citas" | "pedidos" | "restaurante" | "inmobiliaria" | "llamadas";

/** Definición de una tool agnóstica de proveedor: nombre + JSON Schema de sus parámetros. */
export interface DomainTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const CITAS_TOOLS: DomainTool[] = [
  {
    name: TOOL_NAMES.checkAvailability,
    description:
      "Consulta si hay disponibilidad para un servicio en una fecha/hora, respetando el horario de atención del negocio. Si el horario pedido no está libre, devuelve hasta 3 alternativas.",
    parameters: {
      type: "object",
      properties: {
        treatment: { type: "string", description: "Servicio solicitado (según los servicios configurados por el negocio)." },
        datetime: {
          type: "string",
          description:
            "Fecha y hora solicitadas, en hora local del negocio (no hace falta zona horaria), formato AAAA-MM-DDTHH:MM:SS, ej. 2026-08-23T15:00:00. Usa siempre el año real indicado en el contexto del negocio, nunca un año anterior.",
        },
        durationMinutes: { type: "number", description: "Duración estimada de la cita en minutos." },
        daysAhead: { type: "number", description: "Días hacia adelante a considerar si no se pide una fecha exacta (1-30)." },
      },
    },
  },
  {
    name: TOOL_NAMES.bookAppointment,
    description: "Agenda una cita confirmada. Llama primero a checkAvailability para confirmar el horario.",
    parameters: {
      type: "object",
      properties: {
        datetime: {
          type: "string",
          description:
            "Fecha y hora de la cita, en hora local del negocio (no hace falta zona horaria), formato AAAA-MM-DDTHH:MM:SS, ej. 2026-08-23T15:00:00. Usa siempre el año real indicado en el contexto del negocio, nunca un año anterior.",
        },
        durationMinutes: { type: "number", description: "Duración de la cita en minutos." },
        patientName: { type: "string", description: "Nombre completo del cliente." },
        patientPhone: { type: "string", description: "Teléfono del cliente." },
        patientEmail: { type: "string", description: "Correo del cliente (opcional)." },
        treatment: { type: "string", description: "Servicio a realizar." },
        isNewPatient: { type: "boolean", description: "Si es la primera vez del cliente en el negocio." },
        notes: { type: "string", description: "Notas adicionales (opcional)." },
      },
      required: ["datetime", "durationMinutes", "patientName", "patientPhone", "treatment", "isNewPatient"],
    },
  },
  {
    name: TOOL_NAMES.cancelAppointment,
    description: "Cancela una cita existente, identificada por el cliente y la fecha.",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "ID del evento de Google Calendar, si se conoce." },
        patientName: { type: "string", description: "Nombre del cliente." },
        patientPhone: { type: "string", description: "Teléfono del cliente." },
        datetime: {
          type: "string",
          description: "Fecha y hora aproximadas de la cita a cancelar, en hora local del negocio, formato AAAA-MM-DDTHH:MM:SS.",
        },
      },
    },
  },
];

const PEDIDOS_TOOLS: DomainTool[] = [
  {
    name: TOOL_NAMES.getMenu,
    description: "Devuelve la carta completa del negocio (nombre, precio, descripción y categoría de cada producto).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: TOOL_NAMES.createOrder,
    description: "Registra un pedido confirmado con sus productos y cantidades. Llama a getMenu primero si todavía no conocés los precios exactos.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Productos pedidos, con el nombre exacto tal como aparece en la carta.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nombre exacto del producto según la carta." },
              quantity: { type: "number", description: "Cantidad pedida." },
              notes: { type: "string", description: "Aclaraciones del producto (ej. 'sin cebolla')." },
            },
            required: ["name", "quantity"],
          },
        },
        customerName: { type: "string", description: "Nombre del cliente." },
        customerPhone: { type: "string", description: "Teléfono del cliente." },
        orderType: { type: "string", enum: ["pickup", "delivery"], description: "'pickup' si retira en el local, 'delivery' si es envío a domicilio." },
        deliveryAddress: { type: "string", description: "Dirección de entrega, obligatoria si orderType es 'delivery'." },
        notes: { type: "string", description: "Notas generales del pedido (opcional)." },
      },
      required: ["items", "customerName", "customerPhone", "orderType"],
    },
  },
];

const RESERVE_TABLE_TOOL: DomainTool = {
  name: TOOL_NAMES.reserveTable,
  description:
    "Registra una solicitud de reserva de mesa para comer en el local (no un pedido para retirar/enviar). No asigna una mesa específica — eso lo hace el local a mano.",
  parameters: {
    type: "object",
    properties: {
      customerName: { type: "string", description: "Nombre del cliente." },
      customerPhone: { type: "string", description: "Teléfono del cliente." },
      partySize: { type: "number", description: "Cantidad de personas." },
      reservationTime: {
        type: "string",
        description:
          "Fecha y hora pedida, en hora local del negocio, formato AAAA-MM-DDTHH:MM:SS, ej. 2026-08-23T21:00:00. Usa siempre el año real indicado en el contexto del negocio.",
      },
      notes: { type: "string", description: "Aclaraciones de la reserva (opcional)." },
    },
    required: ["customerName", "customerPhone", "partySize", "reservationTime"],
  },
};

const RESTAURANTE_TOOLS: DomainTool[] = [...PEDIDOS_TOOLS, RESERVE_TABLE_TOOL];

const INMOBILIARIA_TOOLS: DomainTool[] = [
  {
    name: TOOL_NAMES.getProperties,
    description: "Devuelve el listado de propiedades disponibles (dirección, precio, descripción) que coinciden con lo que busca el cliente.",
    parameters: {
      type: "object",
      properties: {
        maxPrice: { type: "number", description: "Precio máximo, si el cliente dio un presupuesto (opcional)." },
      },
    },
  },
  {
    name: TOOL_NAMES.scheduleVisit,
    description: "Registra una solicitud de visita a una propiedad específica. Llamá primero a getProperties para conocer el ID exacto de la propiedad.",
    parameters: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "ID de la propiedad, tal como lo devuelve getProperties." },
        visitTime: {
          type: "string",
          description: "Fecha y hora pedida para la visita, en hora local del negocio, formato AAAA-MM-DDTHH:MM:SS. Usa siempre el año real indicado en el contexto del negocio.",
        },
        customerName: { type: "string", description: "Nombre del cliente." },
        customerPhone: { type: "string", description: "Teléfono del cliente." },
        notes: { type: "string", description: "Aclaraciones de la visita (opcional)." },
      },
      required: ["propertyId", "visitTime", "customerName", "customerPhone"],
    },
  },
];

const LLAMADAS_TOOLS: DomainTool[] = [
  {
    name: TOOL_NAMES.logInquiry,
    description: "Anota la consulta del cliente y su teléfono para que alguien del negocio lo llame. Usar siempre antes de despedirse.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Nombre del cliente, si lo dio." },
        customerPhone: { type: "string", description: "Teléfono del cliente." },
        reason: { type: "string", description: "Resumen breve de qué necesita el cliente." },
      },
      required: ["customerPhone", "reason"],
    },
  },
];

const SHARED_TOOLS: DomainTool[] = [
  {
    name: TOOL_NAMES.getClinicInfo,
    description: "Devuelve información del negocio (dirección, horarios, formas de pago, políticas) para responder preguntas frecuentes.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: TOOL_NAMES.requestHumanHandoff,
    description: "Registra que la llamada necesita atención humana (además de, o en vez de, transferir la llamada).",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo por el que se requiere atención humana." },
      },
    },
  },
];

/** Tools de dominio (checkAvailability, createOrder, etc.) según el rubro, más las compartidas — sin nada específico de proveedor. Usado tanto por Retell (llamadas) como por Claude (WhatsApp). */
export function buildDomainTools(businessType: BusinessType = "citas"): DomainTool[] {
  const domain = (() => {
    switch (businessType) {
      case "pedidos":
        return PEDIDOS_TOOLS;
      case "restaurante":
        return RESTAURANTE_TOOLS;
      case "inmobiliaria":
        return INMOBILIARIA_TOOLS;
      case "llamadas":
        return LLAMADAS_TOOLS;
      case "citas":
      default:
        return CITAS_TOOLS;
    }
  })();
  return [...domain, ...SHARED_TOOLS];
}

type RetellTool =
  | Retell.LlmCreateParams.CustomTool
  | Retell.LlmCreateParams.EndCallTool
  | Retell.LlmCreateParams.TransferCallTool;

/**
 * Traduce las tools de dominio al formato de Retell: cada una como tool
 * `custom` que resuelve contra nuestro webhook de tool-calls (a diferencia de
 * VAPI, Retell hace un POST por cada tool invocada, no las agrupa). Suma
 * `end_call` siempre, y `transfer_call` solo si el negocio configuró un
 * teléfono de recepción.
 */
export function buildRetellTools(params: {
  businessType?: BusinessType;
  receptionPhoneNumber?: string;
  toolCallUrl: string;
}): RetellTool[] {
  const { businessType = "citas", receptionPhoneNumber, toolCallUrl } = params;

  const tools: RetellTool[] = buildDomainTools(businessType).map((tool) => ({
    type: "custom",
    name: tool.name,
    description: tool.description,
    url: toolCallUrl,
    method: "POST",
    parameters: tool.parameters,
  }));

  tools.push({
    type: "end_call",
    name: "endCall",
    description: "Termina la llamada. Usala en cuanto el cliente se despida y no tenga más preguntas pendientes.",
  });

  if (receptionPhoneNumber) {
    tools.push({
      type: "transfer_call",
      name: "transferCall",
      description: "Transferir a recepción cuando el cliente lo pida explícitamente o haya una urgencia que el asistente no pueda resolver.",
      transfer_destination: { type: "predefined", number: receptionPhoneNumber },
      transfer_option: { type: "cold_transfer" },
    });
  }

  return tools;
}
