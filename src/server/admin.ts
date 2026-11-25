import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  appointments,
  barbers,
  businessSettings,
  payments,
  services,
} from '@/db/schema'
import { dayRangeUtc, isDateKey } from '@/lib/availability'
import { isHHMM, validateHours } from '@/lib/finance'
import { APPOINTMENT_STATUSES } from '@/lib/appointment-status'
import type { AppointmentStatus as Status } from '@/lib/appointment-status'
import {
  asRecord,
  optionalText,
  requireBoolean as bool,
  requireUuid as uuid,
  requiredText as text,
} from '@/lib/validation'
import { requireRole } from '@/server/auth.server'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-\s()]{5,20}$/
const MAX_ROWS = 300

interface BarberInput {
  name: string
  email: string
  phone: string | null
  bio: string | null
}

function parseBarber(raw: Record<string, unknown>): BarberInput {
  const email = text(raw.email, 'email', 255).toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('email is invalid')
  }
  const phone = optionalText(raw.phone, 'phone', 20)
  if (phone !== null && !PHONE_PATTERN.test(phone)) {
    throw new Error('phone is invalid')
  }
  return {
    name: text(raw.name, 'name', 100),
    email,
    phone,
    bio: optionalText(raw.bio, 'bio', 1000),
  }
}

interface ServiceInput {
  name: string
  description: string | null
  durationMinutes: number
  price: string
}

function parseService(raw: Record<string, unknown>): ServiceInput {
  const duration = raw.durationMinutes
  if (
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 480
  ) {
    throw new Error('durationMinutes must be an integer between 5 and 480')
  }
  const price = raw.price
  if (
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 99999999
  ) {
    throw new Error('price must be a valid amount')
  }
  return {
    name: text(raw.name, 'name', 100),
    description: optionalText(raw.description, 'description', 1000),
    durationMinutes: duration,
    price: price.toFixed(2),
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}

// --------------------------------------------------------------- settings

const DEFAULT_HOURS: Record<string, { open: string; close: string }> = {
  '1': { open: '09:00', close: '19:00' },
  '2': { open: '09:00', close: '19:00' },
  '3': { open: '09:00', close: '19:00' },
  '4': { open: '09:00', close: '19:00' },
  '5': { open: '09:00', close: '19:00' },
  '6': { open: '09:00', close: '17:00' },
}

async function loadSettings() {
  await db
    .insert(businessSettings)
    .values({ id: 1, businessHours: DEFAULT_HOURS })
    .onConflictDoNothing()
  const [row] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.id, 1))
  if (!row) {
    throw new Error('No se pudo cargar la configuración')
  }
  return row
}

/** Rejects when enabling another barber would exceed `maxBarbers`. */
async function assertBarberCapacity(excludeId?: string) {
  const settings = await loadSettings()
  const [active] = await db
    .select({ total: count() })
    .from(barbers)
    .where(
      excludeId
        ? and(eq(barbers.isActive, true), sql`${barbers.id} <> ${excludeId}`)
        : eq(barbers.isActive, true),
    )
  if ((active?.total ?? 0) >= settings.maxBarbers) {
    throw new Error(
      `Alcanzaste el límite de ${settings.maxBarbers} barberos activos. Súbelo en Configuración o inhabilita a otro.`,
    )
  }
}

interface SettingsInput {
  businessName: string
  businessHours: Record<string, { open: string; close: string }>
  maxBarbers: number
  commissionPercent: string
  chairRentCents: number
  rulesNotes: string | null
}

function parseSettings(raw: Record<string, unknown>): SettingsInput {
  const commission = raw.commissionPercent
  if (
    typeof commission !== 'number' ||
    !Number.isFinite(commission) ||
    commission < 0 ||
    commission > 100
  ) {
    throw new Error('La comisión debe estar entre 0 y 100')
  }
  const max = raw.maxBarbers
  if (
    typeof max !== 'number' ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 1000
  ) {
    throw new Error(
      'El límite de barberos debe ser un entero mayor o igual a 1',
    )
  }
  const rent = raw.chairRentCents
  if (
    typeof rent !== 'number' ||
    !Number.isInteger(rent) ||
    rent < 0 ||
    rent > 2_000_000_000
  ) {
    throw new Error('El derecho de silla no es válido')
  }
  const hoursRaw = asRecord(raw.businessHours)
  const hours: Record<string, { open: string; close: string }> = {}
  for (const [day, value] of Object.entries(hoursRaw)) {
    if (!/^[0-6]$/.test(day)) {
      throw new Error('Día de horario inválido')
    }
    if (value === null) {
      continue
    }
    const entry = asRecord(value)
    if (!isHHMM(entry.open) || !isHHMM(entry.close)) {
      throw new Error('Usa el formato HH:MM en los horarios')
    }
    const problem = validateHours(entry.open, entry.close)
    if (problem) {
      throw new Error(problem)
    }
    hours[day] = { open: entry.open, close: entry.close }
  }
  return {
    businessName: text(raw.businessName, 'El nombre del negocio', 100),
    businessHours: hours,
    maxBarbers: max,
    commissionPercent: commission.toFixed(2),
    chairRentCents: rent,
    rulesNotes: optionalText(raw.rulesNotes, 'Las notas', 2000),
  }
}

export const adminGetSettings = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    const row = await loadSettings()
    return {
      businessName: row.businessName,
      businessHours: row.businessHours ?? {},
      maxBarbers: row.maxBarbers,
      commissionPercent: Number(row.commissionPercent),
      chairRentCents: row.chairRentCents,
      rulesNotes: row.rulesNotes,
    }
  },
)

export const adminUpdateSettings = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseSettings(asRecord(input)))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await loadSettings()
    await db
      .update(businessSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businessSettings.id, 1))
    return { ok: true as const }
  })

// ---------------------------------------------------------------- barbers

export const adminListBarbers = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    return db.query.barbers.findMany({
      orderBy: (b, { asc }) => [asc(b.name)],
    })
  },
)

export const adminCreateBarber = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseBarber(asRecord(input)))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await assertBarberCapacity()
    try {
      const [row] = await db.insert(barbers).values(data).returning()
      return row
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error('Ya existe un barbero con ese correo')
      }
      throw error
    }
  })

export const adminUpdateBarber = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const raw = asRecord(input)
    return { id: uuid(raw.id, 'id'), ...parseBarber(raw) }
  })
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const { id, ...values } = data
    try {
      const [row] = await db
        .update(barbers)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(barbers.id, id))
        .returning()
      if (!row) {
        throw new Error('Barbero no encontrado')
      }
      return row
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error('Ya existe un barbero con ese correo')
      }
      throw error
    }
  })

export const adminSetBarberActive = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const raw = asRecord(input)
    return {
      id: uuid(raw.id, 'id'),
      isActive: bool(raw.isActive, 'isActive'),
    }
  })
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.isActive) {
      await assertBarberCapacity(data.id)
    }
    const [row] = await db
      .update(barbers)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(barbers.id, data.id))
      .returning()
    if (!row) {
      throw new Error('Barbero no encontrado')
    }
    return row
  })

// --------------------------------------------------------------- services

export const adminListServices = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    return db.query.services.findMany({
      orderBy: (s, { asc }) => [asc(s.name)],
    })
  },
)

export const adminCreateService = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseService(asRecord(input)))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [row] = await db.insert(services).values(data).returning()
    return row
  })

export const adminUpdateService = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const raw = asRecord(input)
    return { id: uuid(raw.id, 'id'), ...parseService(raw) }
  })
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const { id, ...values } = data
    const [row] = await db
      .update(services)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning()
    if (!row) {
      throw new Error('Servicio no encontrado')
    }
    return row
  })

export const adminSetServiceActive = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const raw = asRecord(input)
    return {
      id: uuid(raw.id, 'id'),
      isActive: bool(raw.isActive, 'isActive'),
    }
  })
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [row] = await db
      .update(services)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(services.id, data.id))
      .returning()
    if (!row) {
      throw new Error('Servicio no encontrado')
    }
    return row
  })

// ----------------------------------------------------------- appointments

interface AppointmentFilters {
  from: string | null
  to: string | null
  barberId: string | null
  status: Status | null
}

function parseFilters(input: unknown): AppointmentFilters {
  const raw = input === undefined ? {} : asRecord(input)
  const dateKey = (value: unknown, field: string) => {
    if (value === undefined || value === null || value === '') {
      return null
    }
    if (!isDateKey(value)) {
      throw new Error(`${field} must be YYYY-MM-DD`)
    }
    return value
  }
  let status: Status | null = null
  if (raw.status !== undefined && raw.status !== null && raw.status !== '') {
    const found = APPOINTMENT_STATUSES.find((s) => s === raw.status)
    if (!found) {
      throw new Error('status is invalid')
    }
    status = found
  }
  const barberId =
    raw.barberId === undefined || raw.barberId === null || raw.barberId === ''
      ? null
      : uuid(raw.barberId, 'barberId')
  return {
    from: dateKey(raw.from, 'from'),
    to: dateKey(raw.to, 'to'),
    barberId,
    status,
  }
}

function buildConditions(filters: AppointmentFilters): Array<SQL> {
  const conditions: Array<SQL> = []
  if (filters.from) {
    conditions.push(gte(appointments.startsAt, dayRangeUtc(filters.from).start))
  }
  if (filters.to) {
    conditions.push(lt(appointments.startsAt, dayRangeUtc(filters.to).end))
  }
  if (filters.barberId) {
    conditions.push(eq(appointments.barberId, filters.barberId))
  }
  if (filters.status) {
    conditions.push(eq(appointments.status, filters.status))
  }
  return conditions
}

export const adminListAppointments = createServerFn({ method: 'GET' })
  .validator((input: unknown) => parseFilters(input))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const where = and(...buildConditions(data))
    const rows = await db.query.appointments.findMany({
      where,
      orderBy: [desc(appointments.startsAt)],
      limit: MAX_ROWS,
      with: {
        barber: { columns: { name: true } },
        customer: { columns: { name: true, email: true } },
        service: { columns: { name: true, price: true } },
      },
    })

    const byStatus = await db
      .select({ status: appointments.status, total: count() })
      .from(appointments)
      .where(where)
      .groupBy(appointments.status)

    const [revenue] = await db
      .select({
        cents: sql<string>`coalesce(sum(${payments.amountInCents}), 0)`,
      })
      .from(payments)
      .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
      .where(and(where, eq(payments.status, 'approved')))

    const statusCounts: Record<Status, number> = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      no_show: 0,
    }
    for (const row of byStatus) {
      if (row.status) {
        statusCounts[row.status] = row.total
      }
    }

    return {
      appointments: rows.map((row) => ({
        id: row.id,
        startsAt: row.startsAt.toISOString(),
        status: row.status,
        barberName: row.barber.name,
        customerName: row.customer.name,
        customerEmail: row.customer.email,
        serviceName: row.service.name,
        servicePrice: row.service.price,
      })),
      truncated: rows.length === MAX_ROWS,
      metrics: {
        statusCounts,
        approvedRevenueCents: Number(revenue?.cents ?? 0),
      },
    }
  })
