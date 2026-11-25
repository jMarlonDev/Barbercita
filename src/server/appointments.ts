import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, gte, inArray, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  appointments,
  availability,
  barberServices,
  services,
} from '@/db/schema'

const SLOT_INTERVAL_MINUTES = 30
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed'] as const

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

export const createAppointment = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      barberId: string
      customerId: string
      serviceId: string
      startsAt: string
    }) => input,
  )
  .handler(async ({ data }) => {
    // 1. Get service duration
    const duration = await getServiceDuration(data.barberId, data.serviceId)

    const startsAt = new Date(data.startsAt)
    if (Number.isNaN(startsAt.getTime())) {
      throw new Error('Invalid start date')
    }
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
        customerId: data.customerId,
        serviceId: data.serviceId,
        startsAt,
        endsAt,
        status: 'pending',
      })
      .returning()

    return created!
  })
