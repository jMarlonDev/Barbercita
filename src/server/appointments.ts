import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, gte, inArray, lt } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  appointments,
  availability,
  barberServices,
  customers,
  services,
} from '@/db/schema'
import { requireAuth, requireRole } from '@/server/auth.server'

const SLOT_INTERVAL_MINUTES = 30
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

/**
 * Parse a time string (HH:MM or HH:MM:SS) into total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const parts = time.split(':')
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  return hours * 60 + minutes
}

/**
 * Get the effective service duration for a barber–service pair.
 * Returns the custom duration if set, otherwise the service default.
 */
async function getServiceDuration(
  barberId: string,
  serviceId: string,
): Promise<number> {
  const barberService = await db.query.barberServices.findFirst({
    where: and(
      eq(barberServices.barberId, barberId),
      eq(barberServices.serviceId, serviceId),
    ),
  })

  if (barberService?.customDuration) {
    return barberService.customDuration
  }

  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
  })

  if (!service) {
    throw new Error('Service not found')
  }

  return service.durationMinutes
}

export const getAvailableSlots = createServerFn({ method: 'GET' })
  .validator(
    (input: { barberId: string; serviceId: string; date: string }) => input,
  )
  .handler(async ({ data }) => {
    const requestedDate = new Date(data.date)
    if (Number.isNaN(requestedDate.getTime())) {
      throw new Error('Invalid date')
    }
    const dayOfWeek = requestedDate.getUTCDay()

    // 1. Get barber availability for this day of week
    const slots = await db.query.availability.findMany({
      where: and(
        eq(availability.barberId, data.barberId),
        eq(availability.dayOfWeek, dayOfWeek),
        eq(availability.isActive, true),
      ),
      orderBy: (a, { asc }) => [asc(a.startTime)],
    })

    if (slots.length === 0) {
      return []
    }

    // 2. Get service duration
    const duration = await getServiceDuration(data.barberId, data.serviceId)

    // 3. Get existing appointments for this barber on this date
    const dateStr = requestedDate.toISOString().split('T')[0]!
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)

    const busySlots = await db
      .select({
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.barberId, data.barberId),
          gte(appointments.startsAt, dayStart),
          lt(appointments.startsAt, dayEnd),
          inArray(appointments.status, [...ACTIVE_APPOINTMENT_STATUSES]),
        ),
      )

    // 4. Calculate available time slots
    const availableStartTimes: string[] = []

    for (const slot of slots) {
      const slotStartMinutes = timeToMinutes(slot.startTime)
      const slotEndMinutes = timeToMinutes(slot.endTime)

      for (
        let minutes = slotStartMinutes;
        minutes + duration <= slotEndMinutes;
        minutes += SLOT_INTERVAL_MINUTES
      ) {
        const candidateStart = new Date(`${dateStr}T00:00:00.000Z`)
        candidateStart.setUTCHours(0, minutes, 0, 0)

        const candidateEnd = new Date(candidateStart)
        candidateEnd.setUTCMinutes(candidateEnd.getUTCMinutes() + duration)

        const hasConflict = busySlots.some((busy) => {
          const busyStart = new Date(busy.startsAt)
          const busyEnd = new Date(busy.endsAt)
          return candidateStart < busyEnd && candidateEnd > busyStart
        })

        if (!hasConflict) {
          availableStartTimes.push(candidateStart.toISOString())
        }
      }
    }

    return availableStartTimes
  })

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
      const barberId = requireUuid(input.barberId, 'Barber id')
      const serviceId = requireUuid(input.serviceId, 'Service id')
      const customerId = input.customerId
        ? requireUuid(input.customerId, 'Customer id')
        : undefined

      if (typeof input.startsAt !== 'string') {
        throw new Error('Start date is required')
      }

      const startsAt = new Date(input.startsAt)
      if (Number.isNaN(startsAt.getTime())) {
        throw new Error('Invalid start date')
      }

      const notes =
        typeof input.notes === 'string'
          ? input.notes.trim() || undefined
          : undefined
      if (notes && notes.length > MAX_NOTES_LENGTH) {
        throw new Error(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`)
      }

      return {
        barberId,
        serviceId,
        startsAt: startsAt.toISOString(),
        notes,
        customerId,
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

    // 1. Get service duration
    const duration = await getServiceDuration(data.barberId, data.serviceId)

    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(startsAt)
    endsAt.setUTCMinutes(endsAt.getUTCMinutes() + duration)

    // 2. Validate no overlapping appointments
    const overlapping = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.barberId, data.barberId),
          lt(appointments.startsAt, endsAt),
          gt(appointments.endsAt, startsAt),
          inArray(appointments.status, [...ACTIVE_APPOINTMENT_STATUSES]),
        ),
      )

    if (overlapping.length > 0) {
      throw new Error('The selected time slot is not available')
    }

    // 3. Insert the appointment
    const [created] = await db
      .insert(appointments)
      .values({
        barberId: data.barberId,
        customerId,
        serviceId: data.serviceId,
        startsAt,
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
      },
      orderBy: (a, { desc }) => [desc(a.startsAt)],
    })
  },
)

export const cancelAppointment = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string }) => ({
    appointmentId: requireUuid(input.appointmentId, 'Appointment id'),
  }))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const appointment = await findAppointmentOrThrow(data.appointmentId)

    const isAuthorized =
      user.role === 'admin' ||
      appointment.customerId === user.id ||
      (user.role === 'barber' && appointment.barberId === user.barberId)

    if (!isAuthorized) {
      throw new Error('Forbidden')
    }

    const currentStatus = appointment.status ?? 'pending'
    if (!isActiveStatus(currentStatus)) {
      throw new Error('Only pending or confirmed appointments can be cancelled')
    }

    if (appointment.startsAt.getTime() <= Date.now()) {
      throw new Error('Past appointments cannot be cancelled')
    }

    return setAppointmentStatus(data.appointmentId, 'cancelled')
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
