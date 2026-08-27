import type { BusinessHours, DayHours } from "@/types/database";

const SLOT_MINUTES = 30;
const FALLBACK_TIME_ZONE = "America/Mexico_City";

/**
 * Valida un identificador de timezone antes de pasarlo a Intl.DateTimeFormat
 * (que tira una excepción síncrona con cualquier valor que no sea un IANA
 * válido, ej. si alguien guardó "Argentina" en vez de
 * "America/Argentina/Buenos_Aires") — una llamada de voz no debería cortarse
 * por un dato de configuración mal cargado.
 */
export function resolveTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

type WeekdayKey = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: WeekdayKey;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timeZone),
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "long",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday.toLowerCase() as WeekdayKey,
  };
}

/** Convierte una hora "de pared" (año/mes/día/hora/minuto) en la timezone dada a un instante UTC real. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = getZonedParts(utcGuess, timeZone);
  const asUtcOfParts = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const diffMs = asUtcOfParts - utcGuess.getTime();
  return new Date(utcGuess.getTime() - diffMs);
}

const OFFSET_SUFFIX_REGEX = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_DATETIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Parsea una fecha/hora recibida de una tool de VAPI (el modelo casi nunca
 * incluye offset/"Z", aunque el prompt se lo pida). Si trae offset, se
 * interpreta tal cual; si no, se interpreta como hora de pared en la
 * timezone del negocio (que es lo que un cliente/agente quieren decir al
 * hablar de "las 3 de la tarde"), evitando el corrimiento de horas que daría
 * un `new Date(...)` ingenuo corriendo en un servidor en UTC.
 */
export function parseLocalDateTime(input: string, timeZone: string): Date {
  if (OFFSET_SUFFIX_REGEX.test(input)) {
    return new Date(input);
  }
  const match = input.match(NAIVE_DATETIME_REGEX);
  if (!match) return new Date(input);
  const [, year, month, day, hour, minute] = match;
  return zonedTimeToUtc(Number(year), Number(month), Number(day), Number(hour), Number(minute), timeZone);
}

/**
 * Formatea un instante en la timezone del negocio para hablar/mostrar al
 * cliente, en español natural ("a las 3 de la tarde") en vez de notación
 * a.m./p.m. — el modelo tiende a repetir el string tal cual, y "p.m." se
 * lee mal o en inglés en la síntesis de voz.
 */
export function formatLocal(date: Date, timeZone: string): string {
  const safeTimeZone = resolveTimeZone(timeZone);
  const datePart = new Intl.DateTimeFormat("es-MX", {
    timeZone: safeTimeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour24 = Number(timeParts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = timeParts.find((p) => p.type === "minute")?.value ?? "00";

  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 < 12 ? "de la mañana" : hour24 < 19 ? "de la tarde" : "de la noche";
  const minuteText = minute === "00" ? "" : ` y ${minute}`;

  return `${datePart}, a las ${hour12}${minuteText} ${period}`;
}

/** ¿El negocio está abierto ahora mismo según su horario de atención configurado? */
export function isWithinBusinessHours(businessHours: BusinessHours, timeZone: string, now: Date = new Date()): boolean {
  const parts = getZonedParts(now, resolveTimeZone(timeZone));
  const hours = businessHours[parts.weekday];
  if (!hours) return false;

  const [startHour, startMinute] = hours.start.split(":").map(Number);
  const [endHour, endMinute] = hours.end.split(":").map(Number);
  const nowMinutes = parts.hour * 60 + parts.minute;
  return nowMinutes >= startHour * 60 + startMinute && nowMinutes < endHour * 60 + endMinute;
}

export interface BusyRange {
  start: Date;
  end: Date;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function dayHoursFor(businessHours: BusinessHours, weekday: WeekdayKey): DayHours | null {
  return businessHours[weekday] ?? null;
}

/** Genera los slots de SLOT_MINUTES dentro del horario de atención de un día concreto, en UTC. */
function slotsForDay(dayStart: Date, timeZone: string, businessHours: BusinessHours, durationMinutes: number): Date[] {
  const parts = getZonedParts(dayStart, timeZone);
  const hours = dayHoursFor(businessHours, parts.weekday);
  if (!hours) return [];

  const [startHour, startMinute] = hours.start.split(":").map(Number);
  const [endHour, endMinute] = hours.end.split(":").map(Number);

  const dayOpen = zonedTimeToUtc(parts.year, parts.month, parts.day, startHour, startMinute, timeZone);
  const dayClose = zonedTimeToUtc(parts.year, parts.month, parts.day, endHour, endMinute, timeZone);

  const slots: Date[] = [];
  let cursor = new Date(dayOpen);
  while (cursor.getTime() + durationMinutes * 60_000 <= dayClose.getTime()) {
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60_000);
  }
  return slots;
}

function isSlotFree(slotStart: Date, durationMinutes: number, busy: BusyRange[]): boolean {
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
  return !busy.some((range) => rangesOverlap(slotStart, slotEnd, range.start, range.end));
}

export interface FindAvailabilityParams {
  requestedStart?: Date;
  durationMinutes: number;
  timeZone: string;
  businessHours: BusinessHours;
  busy: BusyRange[];
  daysAhead?: number;
  maxAlternatives?: number;
  now?: Date;
}

export interface AvailabilityAlternative {
  iso: string;
  local: string;
}

export interface AvailabilityResult {
  requestedAvailable: boolean;
  alternatives: AvailabilityAlternative[];
}

/**
 * Busca disponibilidad de `durationMinutes` respetando `businessHours` y `busy`.
 * Si `requestedStart` está libre, lo marca disponible. Si no (o si no se pidió
 * un horario concreto), junta hasta `maxAlternatives` huecos futuros.
 */
export function findAvailability(params: FindAvailabilityParams): AvailabilityResult {
  const {
    requestedStart,
    durationMinutes,
    timeZone,
    businessHours,
    busy,
    daysAhead = 14,
    maxAlternatives = 3,
    now = new Date(),
  } = params;

  const requestedAvailable = requestedStart ? isSlotFree(requestedStart, durationMinutes, busy) : false;
  if (requestedStart && requestedAvailable) {
    return { requestedAvailable: true, alternatives: [] };
  }

  const searchStart = requestedStart && requestedStart > now ? requestedStart : now;
  const alternatives: AvailabilityAlternative[] = [];

  for (let dayOffset = 0; dayOffset < daysAhead && alternatives.length < maxAlternatives; dayOffset++) {
    const dayCursor = new Date(searchStart.getTime() + dayOffset * 24 * 60 * 60_000);
    const slots = slotsForDay(dayCursor, timeZone, businessHours, durationMinutes);

    for (const slot of slots) {
      if (alternatives.length >= maxAlternatives) break;
      if (slot < searchStart) continue;
      if (!isSlotFree(slot, durationMinutes, busy)) continue;
      alternatives.push({ iso: slot.toISOString(), local: formatLocal(slot, timeZone) });
    }
  }

  return { requestedAvailable: false, alternatives };
}
