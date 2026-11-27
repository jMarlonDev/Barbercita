import { BUSINESS_TIME_ZONE, BUSINESS_UTC_OFFSET_MINUTES, toDateKey } from '@/lib/availability'

export { toDateKey }

/** Hoy (YYYY-MM-DD) en la zona del negocio. */
export function businessToday(): string {
  return toDateKey(new Date())
}

const keyToUtc = (key: string) => new Date(`${key}T00:00:00Z`)
const utcToKey = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(key: string, days: number): string {
  const d = keyToUtc(key)
  d.setUTCDate(d.getUTCDate() + days)
  return utcToKey(d)
}

export function addMonths(key: string, months: number): string {
  const d = keyToUtc(key)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return utcToKey(d)
}

/** Lunes de la semana que contiene `key`. */
export function startOfWeek(key: string): string {
  const dow = (keyToUtc(key).getUTCDay() + 6) % 7
  return addDays(key, -dow)
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`
}

export function endOfMonth(key: string): string {
  const d = keyToUtc(startOfMonth(key))
  return utcToKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

export function weekDays(key: string): string[] {
  const start = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 6 semanas (42 días) empezando el lunes anterior al día 1. */
export function monthGrid(key: string): string[] {
  const start = startOfWeek(startOfMonth(key))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** Minutos desde medianoche (hora del negocio) de un instante ISO. */
export function minutesOfDay(iso: string): number {
  const local = new Date(new Date(iso).getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

const fmt = (opts: Intl.DateTimeFormatOptions, tz = 'UTC') => new Intl.DateTimeFormat('es-CO', { ...opts, timeZone: tz })

export const formatters = {
  monthYear: fmt({ month: 'long', year: 'numeric' }),
  month: fmt({ month: 'long' }),
  weekdayShort: fmt({ weekday: 'short' }),
  weekdayLong: fmt({ weekday: 'long' }),
  dayLong: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
  dayMonth: fmt({ day: 'numeric', month: 'short' }),
  time: fmt({ hour: 'numeric', minute: '2-digit' }, BUSINESS_TIME_ZONE),
}

export const dateOf = (key: string) => keyToUtc(key)
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
