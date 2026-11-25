import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, inArray, lt, ne, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { db } from '@/db/client'
import type * as schema from '@/db/schema'
import {
  appointments,
  availability,
  barberServices,
  customers,
} from '@/db/schema'
import type { AuthUser } from '@/lib/auth'
import {
  MAX_RANGE_DAYS,
  dayRangeUtc,
  isDateKey,
  listDateKeys,
  slotsForDate,
  toDateKey,
} from '@/lib/availability'
import { requireAuth, requireRole } from '@/server/auth.server'

type Executor = PgDatabase<PostgresJsQueryResultHKT, typeof schema>

const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed'] as const
const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
] as const
const MAX_NOTES_LENGTH = 500
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

const ALLOWED_TRANSITIONS: Record<
  AppointmentStatus,
  ReadonlyArray<AppointmentStatus>
> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as ReadonlyArray<string>).includes(value)
}

function isActiveStatus(
  status: AppointmentStatus,
): status is (typeof ACTIVE_APPOINTMENT_STATUSES)[number] {
  return status === 'pending' || status === 'confirmed'
}

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new Error(`${field} must be a valid UUID`)
  }
  return value
}

function requireInstant(value: unknown, field: string): Date {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date`)
  }
  return date
}

/**
 * Effective duration for a barber–service pair. Fails unless the barber is
 * active, offers the service and the service is active.
 */
async function getBookableDuration(
  executor: Executor,
  barberId: string,
  serviceId: string,
): Promise<number> {
  const row = await executor.query.barberServices.findFirst({
    where: and(
      eq(barberServices.barberId, barberId),
      eq(barberServices.serviceId, serviceId),
    ),
    with: { barber: true, service: true },
  })

  if (!row || !row.barber.isActive || !row.service.isActive) {
    throw new Error('Service is not available for this barber')
  }

  return row.customDuration ?? row.service.durationMinutes
}

/** Free bookable slots per business-local date in `[from, to]`. */
async function computeAvailability(
  executor: Executor,
  params: {
    barberId: string
    serviceId: string
    from: string
    to: string
    excludeAppointmentId?: string
  },
): Promise<Record<string, string[]>> {
  const duration = await getBookableDuration(
    executor,
    params.barberId,
    params.serviceId,
  )
  const dateKeys = listDateKeys(params.from, params.to)

  const [windows, busy] = await Promise.all([
    executor.query.availability.findMany({
      where: and(
        eq(availability.barberId, params.barberId),
        eq(availability.isActive, true),
      ),
    }),
    executor
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.barberId, params.barberId),
          lt(appointments.startsAt, dayRangeUtc(params.to).end),
          gt(appointments.endsAt, dayRangeUtc(params.from).start),
          inArray(appointments.status, [...ACTIVE_APPOINTMENT_STATUSES]),
          params.excludeAppointmentId
            ? ne(appointments.id, params.excludeAppointmentId)
            : undefined,
        ),
      ),
  ])

  const now = new Date()
  return Object.fromEntries(
    dateKeys.map((key) => [
      key,
      slotsForDate(key, windows, busy, duration, now),
    ]),
  )
}

/**
 * Serialize bookings per barber, then verify the requested start is still a
 * free slot. Must run inside a transaction. Returns the appointment end.
 */
async function reserveSlot(
  tx: Executor,
  params: {
    barberId: string
    serviceId: string
    startsAt: Date
    excludeAppointmentId?: string
  },
): Promise<Date> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${params.barberId}))`,
  )

  const dateKey = toDateKey(params.startsAt)
  const byDate = await computeAvailability(tx, {
    ...params,
    from: dateKey,
    to: dateKey,
  })

  if (!byDate[dateKey]?.includes(params.startsAt.toISOString())) {
    throw new Error('The selected time slot is not available')
  }

  const duration = await getBookableDuration(
    tx,
    params.barberId,
    params.serviceId,
  )
  return new Date(params.startsAt.getTime() + duration * 60_000)
}

export const getAvailability = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      barberId: string
      serviceId: string
      from: string
      to: string
    }) => {
      if (!isDateKey(input.from) || !isDateKey(input.to)) {
        throw new Error('Dates must use the YYYY-MM-DD format')
      }
      if (listDateKeys(input.from, input.to).length > MAX_RANGE_DAYS) {
        throw new Error(`Range cannot exceed ${MAX_RANGE_DAYS} days`)
      }
      return {
        barberId: requireUuid(input.barberId, 'Barber id'),
        serviceId: requireUuid(input.serviceId, 'Service id'),
        from: input.from,
        to: input.to,
      }
    },
  )
  .handler(({ data }) => computeAvailability(db, data))

async function findAppointmentOrThrow(appointmentId: string) {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  })

  if (!appointment) {
    throw new Error('Appointment not found')
  }

  return appointment
}

async function setAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
) {
  const [updated] = await db
    .update(appointments)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  if (!updated) {
    throw new Error('Appointment not found')
  }

  return updated
}

export const createAppointment = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      barberId: string
      serviceId: string
      startsAt: string
      notes?: string
      customerId?: string
    }) => {
      const notes =
        typeof input.notes === 'string'
          ? input.notes.trim() || undefined
          : undefined
      if (notes && notes.length > MAX_NOTES_LENGTH) {
        throw new Error(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`)
      }

      return {
        barberId: requireUuid(input.barberId, 'Barber id'),
        serviceId: requireUuid(input.serviceId, 'Service id'),
        startsAt: requireInstant(input.startsAt, 'Start date'),
        notes,
        customerId: input.customerId
          ? requireUuid(input.customerId, 'Customer id')
          : undefined,
      }
    },
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()

    let customerId: string

    if (user.role === 'customer') {
      if (data.customerId && data.customerId !== user.id) {
        throw new Error('Forbidden')
      }
      customerId = user.id
    } else {
      if (!data.customerId) {
        throw new Error('Customer id is required')
      }

      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, data.customerId),
        columns: { id: true },
      })

      if (!customer) {
        throw new Error('Customer not found')
      }

      customerId = data.customerId
    }

    return db.transaction(async (tx) => {
      const endsAt = await reserveSlot(tx, data)

      const [created] = await tx
        .insert(appointments)
        .values({
          barberId: data.barberId,
          customerId,
          serviceId: data.serviceId,
          startsAt: data.startsAt,
          endsAt,
          status: 'pending',
          notes: data.notes ?? null,
        })
        .returning()

      if (!created) {
        throw new Error('Failed to create appointment')
      }

      return created
    })
  })

export const getMyAppointments = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth()

    let where: SQL | undefined
    if (user.role === 'admin') {
      where = undefined
    } else if (user.role === 'barber') {
      if (!user.barberId) {
        throw new Error('Forbidden')
      }
      where = eq(appointments.barberId, user.barberId)
    } else {
      where = eq(appointments.customerId, user.id)
    }

    return db.query.appointments.findMany({
      where,
      with: {
        barber: true,
        customer: true,
        service: true,
        payments: true,
      },
      orderBy: (a, { desc }) => [desc(a.startsAt)],
    })
  },
)

/** Customer owner, assigned barber or admin may manage an active, future appointment. */
async function loadManageableAppointment(
  user: AuthUser,
  appointmentId: string,
) {
  const appointment = await findAppointmentOrThrow(appointmentId)

  const isAuthorized =
    user.role === 'admin' ||
    appointment.customerId === user.id ||
    (user.role === 'barber' && appointment.barberId === user.barberId)

  if (!isAuthorized) {
    throw new Error('Forbidden')
  }

  if (!isActiveStatus(appointment.status ?? 'pending')) {
    throw new Error('Only pending or confirmed appointments can be changed')
  }

  if (appointment.startsAt.getTime() <= Date.now()) {
    throw new Error('Past appointments cannot be changed')
  }

  return appointment
}

export const cancelAppointment = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string }) => ({
    appointmentId: requireUuid(input.appointmentId, 'Appointment id'),
  }))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    await loadManageableAppointment(user, data.appointmentId)
    return setAppointmentStatus(data.appointmentId, 'cancelled')
  })

export const rescheduleAppointment = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string; startsAt: string }) => ({
    appointmentId: requireUuid(input.appointmentId, 'Appointment id'),
    startsAt: requireInstant(input.startsAt, 'Start date'),
  }))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const appointment = await loadManageableAppointment(
      user,
      data.appointmentId,
    )

    return db.transaction(async (tx) => {
      const endsAt = await reserveSlot(tx, {
        barberId: appointment.barberId,
        serviceId: appointment.serviceId,
        startsAt: data.startsAt,
        excludeAppointmentId: appointment.id,
      })

      const [updated] = await tx
        .update(appointments)
        .set({ startsAt: data.startsAt, endsAt, updatedAt: new Date() })
        .where(eq(appointments.id, appointment.id))
        .returning()

      if (!updated) {
        throw new Error('Appointment not found')
      }

      return updated
    })
  })

export const updateAppointmentStatus = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string; status: string }) => {
    const appointmentId = requireUuid(input.appointmentId, 'Appointment id')
    const status = input.status

    if (typeof status !== 'string' || !isAppointmentStatus(status)) {
      throw new Error('Invalid appointment status')
    }

    return { appointmentId, status }
  })
  .handler(async ({ data }) => {
    const user = await requireRole(['admin', 'barber'])
    const appointment = await findAppointmentOrThrow(data.appointmentId)

    if (
      user.role === 'barber' &&
      (user.barberId === null || appointment.barberId !== user.barberId)
    ) {
      throw new Error('Forbidden')
    }

    const currentStatus = appointment.status ?? 'pending'

    if (currentStatus === data.status) {
      return appointment
    }

    if (
      currentStatus === 'cancelled' ||
      currentStatus === 'completed' ||
      !ALLOWED_TRANSITIONS[currentStatus].includes(data.status)
    ) {
      throw new Error(
        `Cannot change appointment status from ${currentStatus} to ${data.status}`,
      )
    }

    return setAppointmentStatus(data.appointmentId, data.status)
  })
