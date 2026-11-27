import { BUSINESS_TIME_ZONE, dayRangeUtc, toDateKey } from '@/lib/availability'

export const DAY_MS = 24 * 60 * 60_000

export const longDay = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})
export const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

export function shiftKey(key: string, days: number): string {
  return toDateKey(new Date(dayRangeUtc(key).start.getTime() + days * DAY_MS))
}

/** Midday UTC of a business-day key, safe for formatting in the business zone. */
export function keyToDate(key: string): Date {
  return new Date(dayRangeUtc(key).start.getTime() + 12 * 60 * 60_000)
}

/** Local Date (for react-day-picker) from a YYYY-MM-DD key. */
export function keyToLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function localDateToKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}
