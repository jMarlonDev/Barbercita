/**
 * Pure finance logic for the admin panel (no network, no database).
 * All amounts are integer COP cents. Only approved appointment payments count.
 */

export type RangePreset = 'day' | 'week' | 'month' | 'range'

export interface BarberTotals {
  barberId: string
  name: string
  collectedCents: number
  paidOutCents: number
}

export interface BarberFinanceRow extends BarberTotals {
  shareCents: number
  pendingCents: number
  overpaidCents: number
}

export interface FinanceSummary {
  collectedCents: number
  barberShareCents: number
  paidOutCents: number
  pendingCents: number
  netBalanceCents: number
  rows: Array<BarberFinanceRow>
}

/** Barber part = round(total x (100 - commission) / 100). */
export function barberShareCents(
  totalCents: number,
  commissionPercent: number,
): number {
  return Math.round((totalCents * (100 - commissionPercent)) / 100)
}

export function computeFinance(
  barbers: ReadonlyArray<BarberTotals>,
  commissionPercent: number,
): FinanceSummary {
  const rows = barbers.map((b) => {
    const shareCents = barberShareCents(b.collectedCents, commissionPercent)
    const diff = shareCents - b.paidOutCents
    return {
      ...b,
      shareCents,
      pendingCents: Math.max(diff, 0),
      overpaidCents: Math.max(-diff, 0),
    }
  })
  const sum = (pick: (r: BarberFinanceRow) => number) =>
    rows.reduce((acc, r) => acc + pick(r), 0)
  const collectedCents = sum((r) => r.collectedCents)
  const barberShare = sum((r) => r.shareCents)
  return {
    collectedCents,
    barberShareCents: barberShare,
    paidOutCents: sum((r) => r.paidOutCents),
    pendingCents: sum((r) => r.pendingCents),
    netBalanceCents: collectedCents - barberShare,
    rows,
  }
}

/** Returns an error message (Spanish) or null when the payout is valid. */
export function validatePayout(
  amountCents: number,
  pendingCents: number,
): string | null {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return 'El monto debe ser mayor a cero'
  }
  if (amountCents > pendingCents) {
    return 'El monto no puede exceder lo pendiente por pagar'
  }
  return null
}

const DAY_MS = 86_400_000

function keyToMs(key: string): number {
  return Date.parse(`${key}T00:00:00Z`)
}

function msToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Date-key range (inclusive) for a quick filter relative to `todayKey`. */
export function presetRange(
  preset: Exclude<RangePreset, 'range'>,
  todayKey: string,
): { from: string; to: string } {
  const today = keyToMs(todayKey)
  if (preset === 'day') {
    return { from: todayKey, to: todayKey }
  }
  if (preset === 'week') {
    const dow = new Date(today).getUTCDay()
    const monday = today - ((dow + 6) % 7) * DAY_MS
    return { from: msToKey(monday), to: msToKey(monday + 6 * DAY_MS) }
  }
  const d = new Date(today)
  const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  const last = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  return { from: msToKey(first), to: msToKey(last) }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isHHMM(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/** Error message when open/close are not valid HH:MM with close > open. */
export function validateHours(open: string, close: string): string | null {
  if (!isHHMM(open) || !isHHMM(close)) {
    return 'Usa el formato HH:MM'
  }
  return open < close ? null : 'El cierre debe ser posterior a la apertura'
}
