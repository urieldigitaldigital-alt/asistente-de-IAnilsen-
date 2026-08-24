import { formatLocal, resolveTimeZone } from "@/lib/availability";
import type { AgentConfig, BusinessHours, Clinic, ClinicService, MenuItem } from "@/types/database";

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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatServices(services: ClinicService[]): string {
  if (services.length === 0) return "- (sin servicios configurados)";
  return services
    .map((service) => `- ${service.name} (${service.duration_minutes} min)${service.description ? `: ${service.description}` : ""}`)
    .join("\n");
}

function formatMenu(menuItems: MenuItem[]): string {
  if (menuItems.length === 0) return "- (sin carta configurada)";
  return menuItems
    .map((item) => `- ${item.name} — $${item.price}${item.category ? ` (${item.category})` : ""}${item.description ? `: ${item.description}` : ""}`)
    .join("\n");
}

const CITAS_FLOW = [
  "1. Identifícate como el asistente virtual del negocio.",
  "2. Si el cliente quiere agendar, pregunta el servicio o motivo, y la fecha/hora deseadas.",
  "3. Llama a checkAvailability antes de prometer cualquier horario. Si no está disponible, ofrece las alternativas devueltas.",
  "4. Captura nombre completo, teléfono, correo (opcional) y si es cliente nuevo, uno a la vez, sin repetir cada dato de vuelta al cliente mientras los recopilas — solo pasa a la siguiente pregunta.",
  "5. Cuando ya tengas todos los datos, resume TODO de una sola vez en una sola frase (servicio, fecha y hora, nombre, teléfono) y pide una única confirmación (sí/no). Esta es la ÚNICA verificación de la llamada: no vuelvas a repetir los datos antes ni después de agendar. Si confirma, llama a bookAppointment de inmediato.",
  "6. Después de agendar, da una confirmación final breve en una sola frase (sin repetir todos los datos otra vez) y sigue con la despedida.",
  "7. Respeta siempre el horario de atención y los servicios configurados.",
  "8. Responde preguntas frecuentes usando getClinicInfo o el contexto de arriba.",
  "9. Si el cliente pide hablar con una persona, o hay una urgencia que no puedas resolver, usa la transferencia a recepción o registra un handoff.",
].join("\n");

const PEDIDOS_FLOW = [
  "1. Identifícate como el asistente virtual del negocio y preguntá qué desea pedir.",
  "2. Llamá a getMenu al principio de la llamada para conocer los productos y precios exactos disponibles — nunca inventes productos ni precios que no estén en la carta.",
  "3. Confirmá cada producto y cantidad a medida que el cliente los pide. Si pide algo que no está en la carta, avisale y sugerí alternativas de la carta.",
  "4. Preguntá si el pedido es para retirar en el local o para envío a domicilio. Si es envío, pedí la dirección completa.",
  "5. Capturá nombre completo y teléfono del cliente, uno a la vez, sin repetir cada dato de vuelta mientras los recopilás.",
  "6. Cuando tengas todo, resumí TODO el pedido de una sola vez en una sola frase (productos, cantidades, total, retiro/envío) y pedí una única confirmación (sí/no). Si confirma, llamá a createOrder de inmediato.",
  "7. Después de registrar el pedido con createOrder, decí el número de pedido (orderNumber) que te devuelve la tool, el total y un tiempo estimado aproximado, en una sola frase breve (ej. 'Tu pedido es el número 5, son 7500 pesos, va a estar listo en 30 minutos'), y seguí con la despedida.",
  "8. Respetá siempre el horario de atención configurado.",
  "9. Respondé preguntas frecuentes usando getClinicInfo o el contexto de arriba.",
  "10. Si el cliente pide hablar con una persona, o hay un problema que no puedas resolver, usá la transferencia a recepción o registrá un handoff.",
].join("\n");

/**
 * Compone el system prompt final: el texto editable por el dueño en
 * Personalización (identidad, tono, guardrails) + un contexto estructurado
 * generado a partir de los datos del negocio, siempre sincronizado.
 */
export function buildSystemPrompt(clinic: Clinic, config: AgentConfig): string {
  const isPedidos = clinic.business_type === "pedidos";

  const sections: (string | null)[] = [
    config.system_prompt.trim() ||
      (isPedidos
        ? `Eres el asistente virtual de ${clinic.name}. Ayudas a los clientes a hacer pedidos por teléfono según la carta del negocio, y respondes dudas frecuentes.`
        : `Eres el asistente virtual de ${clinic.name}. Ayudas a los clientes a agendar, consultar y cancelar citas, y respondes dudas frecuentes sobre el negocio.`),
    "",
    `Fecha y hora actuales del negocio: ${formatLocal(new Date(), clinic.timezone)} (${todayIsoDate(clinic.timezone)}). Usa siempre este año real al calcular cualquier fecha para las tools — nunca un año de otra época.`,
    "",
    "## Contexto del negocio",
    `Nombre: ${clinic.name}`,
    clinic.address ? `Dirección: ${clinic.address}` : null,
    clinic.phone ? `Teléfono de recepción: ${clinic.phone}` : null,
    config.clinic_info.paymentMethods?.length
      ? `Formas de pago: ${config.clinic_info.paymentMethods.join(", ")}`
      : null,
    "",
    isPedidos
      ? "## Carta (usa el nombre exacto y el precio al llamar a las tools)"
      : "## Servicios disponibles (usa el nombre exacto y la duración al llamar a las tools)",
    isPedidos ? formatMenu(config.menu_items) : formatServices(config.services),
    "",
    "## Horario de atención",
    formatBusinessHours(config.business_hours),
    config.clinic_info.policies ? `\n## Políticas\n${config.clinic_info.policies}` : null,
    config.clinic_info.faq?.length
      ? `\n## Preguntas frecuentes\n${config.clinic_info.faq.map((item) => `- P: ${item.question}\n  R: ${item.answer}`).join("\n")}`
      : null,
    "",
    "## Flujo de la llamada",
    isPedidos ? PEDIDOS_FLOW : CITAS_FLOW,
    "11. En cuanto el cliente se despida (diga 'chau', 'gracias', 'nada más', 'hasta luego' o similar) y no tenga más preguntas pendientes, despídete brevemente en una sola frase y de inmediato llama a la tool endCall para colgar la llamada. No sigas hablando después de despedirte.",
    "12. Sé conciso en cada turno: frases cortas, sin relleno ni repetir información que el cliente ya confirmó. El objetivo es una llamada breve y directa, no una lectura formal.",
    "13. Di siempre los números en español, nunca en inglés. Los teléfonos léelos dígito por dígito en español (ej. \"cuatro, uno, cero, uno...\"), nunca como un número completo. Las horas dilas en palabras (\"a las tres de la tarde\"), nunca como \"3:00 PM\" ni en inglés.",
    "",
    `Idioma de la conversación: ${config.language === "es" ? "español" : config.language}. Tono: ${config.tone}.`,
  ];

  return sections.filter((line): line is string => line !== null).join("\n");
}

export function buildFirstMessage(config: AgentConfig, clinic: Clinic): string {
  if (config.first_message?.trim()) return config.first_message.trim();
  return clinic.business_type === "pedidos"
    ? `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿qué le gustaría pedir?`
    : `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿le gustaría agendar una cita?`;
}
