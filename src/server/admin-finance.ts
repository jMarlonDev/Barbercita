import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  appointments,
  barberPayouts,
  barbers,
  businessSettings,
  payments,
  services,
} from '@/db/schema'
import { dayRangeUtc, isDateKey } from '@/lib/availability'
import { computeFinance, validatePayout } from '@/lib/finance'
import { requireRole } from '@/server/auth.server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ROWS = 300

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid input')
  }
  return value as Record<string, unknown>
}

function parseRange(raw: Record<string, unknown>) {
  if (!isDateKey(raw.from) || !isDateKey(raw.to) || raw.to < raw.from) {
    throw new Error('Rango de fechas inválido')
  }
  return { from: raw.from, to: raw.to }
}

async function commissionPercent(): Promise<number> {
  const [row] = await db
    .select({ value: businessSettings.commissionPercent })
    .from(businessSettings)
    .where(eq(businessSettings.id, 1))
  return row ? Number(row.value) : 30
}

async function barberTotals(from: string, to: string) {
  const start = dayRangeUtc(from).start
  const end = dayRangeUtc(to).end
  const [list, collected, paid] = await Promise.all([
    db.select({ id: barbers.id, name: barbers.name }).from(barbers),
    db
      .select({
        barberId: appointments.barberId,
        cents: sql<string>`coalesce(sum(${payments.amountInCents}), 0)`,
      })
      .from(payments)
      .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(payments.status, 'approved'),
          gte(appointments.startsAt, start),
          lt(appointments.startsAt, end),
        ),
      )
      .groupBy(appointments.barberId),
    db
      .select({
        barberId: barberPayouts.barberId,
        cents: sql<string>`coalesce(sum(${barberPayouts.amountCents}), 0)`,
      })
      .from(barberPayouts)
      .where(
        and(
          gte(barberPayouts.createdAt, start),
          lt(barberPayouts.createdAt, end),
        ),
      )
      .groupBy(barberPayouts.barberId),
  ])
  const collectedBy = new Map(
    collected.map((r) => [r.barberId, Number(r.cents)]),
  )
  const paidBy = new Map(paid.map((r) => [r.barberId, Number(r.cents)]))
  return list
    .map((b) => ({
      barberId: b.id,
      name: b.name,
      collectedCents: collectedBy.get(b.id) ?? 0,
      paidOutCents: paidBy.get(b.id) ?? 0,
    }))
    .filter((b) => b.collectedCents > 0 || b.paidOutCents > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const adminGetFinance = createServerFn({ method: 'GET' })
  .validator((input: unknown) => parseRange(asRecord(input)))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [percent, totals, history] = await Promise.all([
      commissionPercent(),
      barberTotals(data.from, data.to),
      db
        .select({
          id: payments.id,
          startsAt: appointments.startsAt,
          amountCents: payments.amountInCents,
          barberName: barbers.name,
          serviceName: services.name,
        })
        .from(payments)
        .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
        .innerJoin(barbers, eq(appointments.barberId, barbers.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(payments.status, 'approved'),
            gte(appointments.startsAt, dayRangeUtc(data.from).start),
            lt(appointments.startsAt, dayRangeUtc(data.to).end),
          ),
        )
        .orderBy(desc(appointments.startsAt))
        .limit(MAX_ROWS),
    ])
    return {
      range: data,
      commissionPercent: percent,
      summary: computeFinance(totals, percent),
      history: history.map((h) => ({
        id: h.id,
        startsAt: h.startsAt.toISOString(),
        amountCents: h.amountCents,
        barberName: h.barberName,
        serviceName: h.serviceName,
      })),
      truncated: history.length === MAX_ROWS,
    }
  })

export const adminRegisterPayout = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const raw = asRecord(input)
    if (typeof raw.barberId !== 'string' || !UUID_PATTERN.test(raw.barberId)) {
      throw new Error('barberId inválido')
    }
    const amount = raw.amountCents
    if (typeof amount !== 'number' || !Number.isInteger(amount)) {
      throw new Error('Monto inválido')
    }
    const note =
      typeof raw.note === 'string' && raw.note.trim() !== ''
        ? raw.note.trim().slice(0, 500)
        : null
    return {
      barberId: raw.barberId,
      amountCents: amount,
      note,
      ...parseRange(raw),
    }
  })
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const percent = await commissionPercent()
    const totals = await barberTotals(data.from, data.to)
    const summary = computeFinance(totals, percent)
    const row = summary.rows.find((r) => r.barberId === data.barberId)
    const problem = validatePayout(data.amountCents, row?.pendingCents ?? 0)
    if (problem) {
      throw new Error(problem)
    }
    await db.insert(barberPayouts).values({
      barberId: data.barberId,
      amountCents: data.amountCents,
      note: data.note,
    })
    return { ok: true as const }
  })
