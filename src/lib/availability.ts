import type { BusinessHours, DayHours } from "@/types/database";

const SLOT_MINUTES = 30;

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
    timeZone,
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
function zonedTimeToUtc(
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

/** Formatea un instante en la timezone de la clínica para hablar/mostrar al paciente. */
export function formatLocal(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
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
