/**
 * Pure availability logic (no network, no database).
 *
 * Barber availability windows are stored as wall-clock times in the business
 * time zone; appointments are stored as UTC instants. Colombia has no DST, so
 * a fixed offset is exact.
 */

export const BUSINESS_TIME_ZONE = 'America/Bogota'
export const BUSINESS_UTC_OFFSET_MINUTES = -300
export const SLOT_INTERVAL_MINUTES = 30
export const MAX_RANGE_DAYS = 62

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface AvailabilityWindow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface BusyInterval {
  startsAt: Date
  endsAt: Date
}

/** Parse `YYYY-MM-DD` into the UTC midnight of that calendar date. */
function parseDateKey(dateKey: string): number | null {
  const match = DATE_KEY_PATTERN.exec(dateKey)
  if (!match) {
    return null
  }
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  const ms = Date.UTC(year, month - 1, day)
  return new Date(ms).toISOString().startsWith(dateKey) ? ms : null
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && parseDateKey(value) !== null
}

/** `HH:MM[:SS]` to minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** Business-local calendar date (`YYYY-MM-DD`) of a UTC instant. */
export function toDateKey(instant: Date): string {
  return new Date(instant.getTime() + BUSINESS_UTC_OFFSET_MINUTES * MINUTE_MS)
    .toISOString()
    .slice(0, 10)
}

/** UTC instants delimiting a business-local day: `[start, end)`. */
export function dayRangeUtc(dateKey: string): { start: Date; end: Date } {
  const midnight = parseDateKey(dateKey)
  if (midnight === null) {
    throw new Error('Invalid date')
  }
  const start = midnight - BUSINESS_UTC_OFFSET_MINUTES * MINUTE_MS
  return { start: new Date(start), end: new Date(start + DAY_MS) }
}

/** Inclusive list of date keys between `from` and `to`. */
export function listDateKeys(from: string, to: string): string[] {
  const start = parseDateKey(from)
  const end = parseDateKey(to)
  if (start === null || end === null || end < start) {
    throw new Error('Invalid date range')
  }
  const keys: string[] = []
  for (let ms = start; ms <= end; ms += DAY_MS) {
    keys.push(new Date(ms).toISOString().slice(0, 10))
  }
  return keys
}

/**
 * Bookable start times (ISO, UTC) for one business-local day: inside the
 * barber's windows, long enough for the service, in the future and free of
 * any active appointment.
 */
export function slotsForDate(
  dateKey: string,
  windows: ReadonlyArray<AvailabilityWindow>,
  busy: ReadonlyArray<BusyInterval>,
  durationMinutes: number,
  now: Date,
): string[] {
  const midnight = parseDateKey(dateKey)
  if (midnight === null) {
    throw new Error('Invalid date')
  }
  const dayOfWeek = new Date(midnight).getUTCDay()
  const dayStartMs = dayRangeUtc(dateKey).start.getTime()
  const slots = new Set<number>()

  for (const window of windows) {
    if (window.dayOfWeek !== dayOfWeek) {
      continue
    }
    const end = timeToMinutes(window.endTime)
    for (
      let minutes = timeToMinutes(window.startTime);
      minutes + durationMinutes <= end;
      minutes += SLOT_INTERVAL_MINUTES
    ) {
      const startMs = dayStartMs + minutes * MINUTE_MS
      const endMs = startMs + durationMinutes * MINUTE_MS
      const isFree = !busy.some(
        (b) => startMs < b.endsAt.getTime() && endMs > b.startsAt.getTime(),
      )
      if (startMs > now.getTime() && isFree) {
        slots.add(startMs)
      }
    }
  }

  return [...slots]
    .sort((a, b) => a - b)
    .map((ms) => new Date(ms).toISOString())
}
