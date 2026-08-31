import { formatLocal, isWithinBusinessHours, resolveTimeZone } from "@/lib/availability";
import type { AgentConfig, BusinessHours, Clinic, ClinicService, MenuItem, OrderType } from "@/types/database";

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

/**
 * El modelo suele calcular mal "mañana es X" a partir de la fecha de hoy
 * (confirmado en producción: dijo "abrimos mañana viernes" siendo hoy
 * viernes) — se lo damos ya resuelto en vez de dejarle la aritmética de días.
 */
function todayAndTomorrowLabels(timeZone: string): { today: string; tomorrow: string } {
  const weekdayKey = new Intl.DateTimeFormat("en-US", { timeZone: resolveTimeZone(timeZone), weekday: "long" })
    .format(new Date())
    .toLowerCase();
  const todayIndex = WEEKDAY_ORDER.indexOf(weekdayKey);
  const tomorrowIndex = (todayIndex + 1) % WEEKDAY_ORDER.length;
  return { today: WEEKDAY_LABELS[weekdayKey], tomorrow: WEEKDAY_LABELS[WEEKDAY_ORDER[tomorrowIndex]] };
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

const RESTAURANTE_FLOW = [
  PEDIDOS_FLOW,
  "11. Si en cambio el cliente quiere reservar una mesa para comer en el local (no es un pedido para retirar/enviar), preguntá fecha, hora y cantidad de personas, capturá nombre y teléfono, y llamá a reserveTable. Avisale que la reserva queda registrada y que el local la va a confirmar — todavía no le asignes una mesa específica, eso lo hace el local.",
].join("\n");

const INMOBILIARIA_FLOW = [
  "1. Identifícate como el asistente virtual de la inmobiliaria y preguntá qué tipo de propiedad busca el cliente (zona, precio, ambientes).",
  "2. Llamá a getProperties para consultar las propiedades disponibles que coincidan — nunca inventes propiedades, precios ni direcciones que no te devuelva la tool.",
  "3. Describí brevemente las propiedades que encajen (dirección, precio, características) y preguntá si quiere agendar una visita a alguna.",
  "4. Para agendar la visita, preguntá qué día y horario prefiere, y capturá nombre completo y teléfono del cliente, uno a la vez.",
  "5. Cuando tengas todo, resumí TODO de una sola vez en una sola frase (propiedad, día y hora, nombre, teléfono) y pedí una única confirmación (sí/no). Si confirma, llamá a scheduleVisit de inmediato.",
  "6. Avisale que la visita quedó registrada como solicitud, y que la inmobiliaria se va a comunicar para confirmar el horario exacto.",
  "7. Respondé preguntas frecuentes usando getClinicInfo o el contexto de arriba.",
  "8. Si el cliente pide hablar con una persona, o hay algo que no puedas resolver, usá la transferencia a recepción o registrá un handoff.",
].join("\n");

const LLAMADAS_FLOW = [
  "1. Identifícate como el asistente virtual del negocio y preguntá en qué podés ayudar.",
  "2. Escuchá la consulta del cliente con atención — no agendás citas ni tomás pedidos, tu trabajo es entender qué necesita y anotar sus datos para que alguien del negocio lo llame.",
  "3. Antes de despedirte, pedí siempre el nombre y el número de teléfono del cliente (confirmalo en voz alta aunque ya haya llamado desde ese número), y llamá a logInquiry con esos datos y un resumen breve de la consulta.",
  "4. Confirmá que anotaste sus datos y que alguien del negocio se va a comunicar a la brevedad.",
  "5. Respondé preguntas frecuentes usando getClinicInfo o el contexto de arriba.",
  "6. Si es urgente o pide hablar con una persona ya mismo, usá la transferencia a recepción o registrá un handoff.",
].join("\n");

const SHARED_FLOW_CLOSING_BASE = [
  "- Sé conciso en cada turno: frases cortas, sin relleno ni repetir información que el cliente ya confirmó. El objetivo es una conversación breve y directa, no una lectura formal.",
  "- Al pedir el número de teléfono del cliente, nunca te quedes con unos pocos dígitos (por ejemplo, solo el código de área) — seguí preguntando \"¿y los números que siguen?\" hasta tener el número completo (normalmente 10 dígitos en total) antes de repetirlo de vuelta, confirmarlo o llamar a cualquier tool que lo necesite.",
  "- Variá las palabras y frases que usás entre un turno y otro — no repitas la misma expresión textual dos veces en la conversación (ni saludos, ni confirmaciones, ni despedidas). Sonás natural, no como un guion leído.",
  "- Vos NO tenés forma de saber si un pedido/cita/reserva ya está listo, confirmado por el negocio, en preparación o cancelado — esa información no te la da ningún tool. Si preguntan \"¿está listo?\", \"¿cuánto falta?\", \"¿ya sale?\", \"avisame cuando esté\" o algo similar, respondé siempre con algo como \"Te avisamos por acá apenas esté listo\" — nunca inventes ni asumas un estado, ni aunque haya pasado tiempo desde que se registró.",
  "- Nunca digas que un pedido/cita/reserva quedó registrado, confirmado o cancelado si no acabás de llamar al tool correspondiente (createOrder, bookAppointment, cancelAppointment, etc.) en este mismo turno y recibiste su resultado. Sin eso, todavía no existe — no lo des por hecho de antemano.",
  "- Respuestas cortas y ambiguas del cliente (\"todo\", \"sí\", \"no\", \"dale\", \"cambiar\", \"de nuevo\") interpretalas siempre según la pregunta que vos acabás de hacer, nunca como que el cliente terminó la conversación o no necesita nada más — por ejemplo, si preguntaste \"¿qué querés cambiar?\" y responde \"todo\", significa que quiere cambiar todos los datos, no que se despide. Solo tratá algo como despedida si el cliente usa una palabra de despedida explícita (chau, gracias, nada más, hasta luego) o dice claramente que no necesita nada más.",
];

// Instrucción estricta e innegociable: la síntesis de voz a veces lee una
// cifra suelta ("4108") con acento/idioma inglés aunque el resto de la frase
// esté en español. Deletrear cada dígito como palabra evita ese problema de
// raíz (no hay cifra que la voz pueda malinterpretar).
const VOICE_FLOW_CLOSING = [
  "- En cuanto el cliente se despida (diga 'chau', 'gracias', 'nada más', 'hasta luego' o similar) y no tenga más preguntas pendientes, despídete brevemente en una sola frase y de inmediato llama a la tool endCall para colgar la llamada. No sigas hablando después de despedirte.",
  ...SHARED_FLOW_CLOSING_BASE,
  "- Decí siempre los números en voz alta en español, nunca en inglés — instrucción estricta, sin excepciones. Los teléfonos leélos dígito por dígito, cada uno como palabra en español (ej. \"cuatro, uno, cero, uno...\"), nunca como cifra completa ni en inglés (\"four one zero one\"). Las horas decilas en palabras en español (\"a las tres de la tarde\"), nunca como \"3:00 PM\" ni en inglés.",
].join("\n");

// En WhatsApp es al revés: como es texto (no hay síntesis de voz), un
// teléfono deletreado con letras ("cuatro uno cero ocho...") se lee raro —
// se espera la cifra tal cual, como escribiría cualquier persona.
const WHATSAPP_FLOW_CLOSING = [
  "- En cuanto el cliente se despida (diga 'chau', 'gracias', 'nada más', 'hasta luego' o similar) y no tenga más preguntas pendientes, despedite brevemente en una sola frase y no sigas escribiendo después — no existe ninguna tool para \"colgar\", simplemente dejá de responder.",
  ...SHARED_FLOW_CLOSING_BASE,
  "- Escribí los números siempre con cifras (dígitos), nunca deletreados con letras — instrucción estricta, sin excepciones. Un teléfono se escribe \"1123456789\", nunca \"uno, uno, dos, tres...\". Las horas también con números (\"15:00\" o \"3 de la tarde\"), no hace falta deletrearlas letra por letra como en una llamada.",
].join("\n");

function identityDefault(clinic: Clinic): string {
  switch (clinic.business_type) {
    case "pedidos":
      return `Eres el asistente virtual de ${clinic.name}. Ayudas a los clientes a hacer pedidos por teléfono según la carta del negocio, y respondes dudas frecuentes.`;
    case "restaurante":
      return `Eres el asistente virtual de ${clinic.name}. Ayudas a los clientes a hacer pedidos por teléfono según la carta, y a reservar mesa para comer en el local. Respondes dudas frecuentes.`;
    case "inmobiliaria":
      return `Eres el asistente virtual de la inmobiliaria ${clinic.name}. Ayudas a los clientes a consultar propiedades disponibles y agendar visitas. Respondes dudas frecuentes.`;
    case "llamadas":
      return `Eres el asistente virtual de ${clinic.name}. Tu trabajo es atender la llamada, entender qué necesita el cliente, y anotar sus datos de contacto para que alguien del negocio lo llame. No agendas citas ni tomas pedidos.`;
    case "citas":
    default:
      return `Eres el asistente virtual de ${clinic.name}. Ayudas a los clientes a agendar, consultar y cancelar citas, y respondes dudas frecuentes sobre el negocio.`;
  }
}

/**
 * Restricciones vigentes ahora mismo para tomar pedidos: fuera de horario,
 * pausado a mano por el local (lleno), o solo retiro (sin envíos). Se le
 * avisa al modelo de entrada para que no intente algo que createOrder va a
 * rechazar de todos modos.
 */
function orderAvailabilityNote(clinic: Clinic, config: AgentConfig): string | null {
  if (clinic.business_type !== "pedidos" && clinic.business_type !== "restaurante") return null;

  if (!isWithinBusinessHours(config.business_hours, clinic.timezone)) {
    return "\n## Estado actual del negocio\nEl negocio está CERRADO en este momento. No tomes pedidos — solo respondé consultas e informá el horario de atención.";
  }
  if (config.orders_paused) {
    return "\n## Estado actual del negocio\nLos pedidos por teléfono están PAUSADOS temporalmente (el local está muy lleno). No tomes pedidos nuevos — solo respondé consultas, y avisá que por ahora no se están tomando pedidos.";
  }
  if (config.pickup_only) {
    return "\n## Estado actual del negocio\nSolo se están aceptando pedidos para RETIRAR EN EL LOCAL — no hay envíos a domicilio por el momento. Si el cliente pide envío, avisale y ofrecé la opción de retiro.";
  }
  return null;
}

function contextSection(clinic: Clinic, config: AgentConfig): [string, string] | null {
  switch (clinic.business_type) {
    case "pedidos":
    case "restaurante":
      return ["## Carta (usa el nombre exacto y el precio al llamar a las tools)", formatMenu(config.menu_items)];
    case "citas":
      return ["## Servicios disponibles (usa el nombre exacto y la duración al llamar a las tools)", formatServices(config.services)];
    case "inmobiliaria":
      return [
        "## Propiedades",
        "Usa la tool getProperties para consultar el listado actualizado de propiedades disponibles — nunca inventes propiedades, precios ni direcciones.",
      ];
    case "llamadas":
    default:
      return null;
  }
}

function flowForType(businessType: Clinic["business_type"]): string {
  switch (businessType) {
    case "pedidos":
      return PEDIDOS_FLOW;
    case "restaurante":
      return RESTAURANTE_FLOW;
    case "inmobiliaria":
      return INMOBILIARIA_FLOW;
    case "llamadas":
      return LLAMADAS_FLOW;
    case "citas":
    default:
      return CITAS_FLOW;
  }
}

/** Instrucción de apertura: el saludo configurado en Personalización (mensaje de bienvenida, o el personalizado a un cliente recurrente) para WhatsApp — en llamadas, VAPI lo dice directo como `firstMessage`, no hace falta instrucción. */
export interface OpeningInstruction {
  channel: "whatsapp";
  greeting: string;
}

/** Datos del último pedido de un cliente recurrente (nombre, forma de entrega, dirección) — ver lib/vapi/personalization.ts. */
export interface ReturningCustomerOrderDetails {
  customerName: string;
  lastOrderType: OrderType;
  lastDeliveryAddress: string | null;
}

export interface BuildSystemPromptOptions {
  /** Si se pasa (WhatsApp), agrega la instrucción de saludo inicial: el cliente ya escribió (es su primer mensaje de la conversación), así que el asistente abre su respuesta con el saludo y sigue respondiendo lo que haya preguntado. */
  opening?: OpeningInstruction;
  returningCustomer?: ReturningCustomerOrderDetails | null;
  /**
   * Determina qué instrucciones de formato de números/cierre de conversación
   * usar: en llamadas los números se deletrean como palabras (para que la
   * síntesis de voz los lea en español, nunca en inglés); en WhatsApp se
   * escriben con cifras normales, como escribiría cualquier persona.
   */
  channel?: "voice" | "whatsapp";
}

/**
 * Compone el system prompt final: el texto editable por el dueño en
 * Personalización (identidad, tono, guardrails) + un contexto estructurado
 * generado a partir de los datos del negocio, siempre sincronizado — la
 * misma función para llamadas y WhatsApp, así cualquier cambio en
 * Personalización se refleja en los dos canales.
 */
export function buildSystemPrompt(clinic: Clinic, config: AgentConfig, options: BuildSystemPromptOptions = {}): string {
  const { opening, returningCustomer, channel = "voice" } = options;
  const context = contextSection(clinic, config);
  const { today, tomorrow } = todayAndTomorrowLabels(clinic.timezone);

  const openingHeading = opening ? "## Cómo empezar la conversación" : null;
  const openingBody = opening
    ? `Este es el primer mensaje de esta conversación de WhatsApp con este cliente. Abrí tu respuesta con este saludo, palabra por palabra: "${opening.greeting}"\nDespués seguí respondiendo lo que el cliente haya escrito en su mensaje.`
    : null;

  const returningCustomerNote = returningCustomer
    ? `\n## Cliente recurrente\nEste cliente ya pidió antes en ${clinic.name}. Tenés guardados sus DATOS de la vez pasada — nombre: "${returningCustomer.customerName}", forma de entrega: ${
        returningCustomer.lastOrderType === "delivery" && returningCustomer.lastDeliveryAddress
          ? `envío a "${returningCustomer.lastDeliveryAddress}"`
          : "retiro en el local"
      } — pero NUNCA su pedido anterior (qué productos pidió): eso no lo sabés, no lo tenés, y no debés mencionarlo ni insinuarlo bajo ningún concepto. Cuando el cliente esté por hacer un pedido nuevo (no antes, no de arranque), preguntale primero si querés que le repitas los datos guardados para confirmar que están bien (por ejemplo: "¿querés que te diga los datos que tengo guardados para ver si están bien, o preferís pasarlos de nuevo?") — recién si dice que sí, decíselos y preguntá si los mantiene o los cambia; si dice que no, pedíselos de cero como a cualquier cliente nuevo. Nunca des los datos por confirmados sin preguntar antes. El pedido en sí siempre es nuevo: tomá siempre lo que pida en esta conversación, nunca repitas ni asumas productos de una vez anterior.`
    : null;

  const sections: (string | null)[] = [
    config.system_prompt.trim() || identityDefault(clinic),
    "",
    `Fecha y hora actuales del negocio: ${formatLocal(new Date(), clinic.timezone)} (${todayIsoDate(clinic.timezone)}). Hoy es ${today}, mañana es ${tomorrow} — usa siempre estos valores ya calculados al hablar de "hoy"/"mañana", nunca los calcules vos, y usa siempre este año real al calcular cualquier fecha para las tools, nunca un año de otra época. Este dato es la verdad absoluta y se recalcula en cada mensaje: si en un mensaje anterior de esta misma conversación dijiste un día, una hora, o si el negocio está abierto/cerrado, y no coincide con esto, ESTABA MAL — corregite de inmediato sin disculparte de más, usá siempre este valor actualizado, y no vuelvas a repetir el dato viejo.`,
    "",
    openingHeading,
    openingBody,
    opening ? "" : null,
    "## Contexto del negocio",
    `Nombre: ${clinic.name}`,
    clinic.address ? `Dirección: ${clinic.address}` : null,
    clinic.phone ? `Teléfono de recepción: ${clinic.phone}` : null,
    config.clinic_info.paymentMethods?.length
      ? `Formas de pago: ${config.clinic_info.paymentMethods.join(", ")}`
      : null,
    context ? "" : null,
    context ? context[0] : null,
    context ? context[1] : null,
    "",
    "## Horario de atención",
    formatBusinessHours(config.business_hours),
    config.clinic_info.policies ? `\n## Políticas\n${config.clinic_info.policies}` : null,
    config.clinic_info.faq?.length
      ? `\n## Preguntas frecuentes\n${config.clinic_info.faq.map((item) => `- P: ${item.question}\n  R: ${item.answer}`).join("\n")}`
      : null,
    orderAvailabilityNote(clinic, config),
    returningCustomerNote,
    "",
    "## Flujo de la conversación",
    flowForType(clinic.business_type),
    channel === "whatsapp" ? WHATSAPP_FLOW_CLOSING : VOICE_FLOW_CLOSING,
    "",
    `Idioma de la conversación: ${config.language === "es" ? "español" : config.language}. Tono: ${config.tone}.`,
  ];

  return sections.filter((line): line is string => line !== null).join("\n");
}

export function buildFirstMessage(config: AgentConfig, clinic: Clinic): string {
  if (config.first_message?.trim()) return config.first_message.trim();
  switch (clinic.business_type) {
    case "pedidos":
      return `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿qué le gustaría pedir?`;
    case "restaurante":
      return `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿quiere hacer un pedido o reservar una mesa?`;
    case "inmobiliaria":
      return `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿qué tipo de propiedad está buscando?`;
    case "llamadas":
      return `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿en qué le puedo ayudar?`;
    case "citas":
    default:
      return `Gracias por llamar a ${clinic.name}. Soy el asistente virtual, ¿le gustaría agendar una cita?`;
  }
}
