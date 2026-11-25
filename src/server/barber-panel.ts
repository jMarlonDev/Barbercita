import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, gt, gte, inArray, lt, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointments, availability, barbers } from '@/db/schema'
import {
  dayRangeUtc,
  isDateKey,
  slotsForDate,
  toDateKey,
} from '@/lib/availability'
import {
  canBarberTransition,
  isBarberTargetStatus,
} from '@/lib/appointment-status'
import { requireUuid } from '@/lib/validation'
import { requireRole } from '@/server/auth.server'
import { logAppointmentEvent } from '@/server/appointment-events.server'

const HISTORY_DAYS = 180
const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

function cleanText(
  value: unknown,
  field: string,
  max: number,
  required: boolean,
): string | null {
  if (value === null || value === undefined || value === '') {
    if (required) throw new Error(`${field} is required`)
    return null
  }
  if (typeof value !== 'string') throw new Error(`${field} must be text`)
  const trimmed = value.trim()
  if (!trimmed) {
    if (required) throw new Error(`${field} is required`)
    return null
  }
  if (trimmed.length > max) throw new Error(`${field} is too long`)
  return trimmed
}

async function requireBarber() {
  const user = await requireRole(['barber'])
  if (!user.barberId) {
    throw new Error('Forbidden')
  }
  return { user, barberId: user.barberId }
}

/** Own appointments from the last 180 days onward (history included). */
export const getBarberAgenda = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { barberId } = await requireBarber()
    const since = new Date(
      dayRangeUtc(toDateKey(new Date())).start.getTime() -
        HISTORY_DAYS * DAY_MS,
    )

    return db.query.appointments.findMany({
      where: and(
        eq(appointments.barberId, barberId),
        gte(appointments.startsAt, since),
      ),
      with: { customer: true, service: true, payments: true },
      orderBy: [asc(appointments.startsAt)],
    })
  },
)

export const getBarberProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { barberId } = await requireBarber()
    const barber = await db.query.barbers.findFirst({
      where: eq(barbers.id, barberId),
    })
    if (!barber) throw new Error('Barber not found')
    return {
      name: barber.name,
      email: barber.email,
      phone: barber.phone,
      paymentMethod: barber.paymentMethod,
    }
  },
)

export const updateBarberProfile = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      name: string
      phone?: string | null
      paymentMethod?: string | null
    }) => {
      const name = cleanText(input.name, 'Name', 100, true)
      const phone = cleanText(input.phone, 'Phone', 20, false)
      if (phone !== null && !/^[0-9+()\-\s]{7,20}$/.test(phone)) {
        throw new Error('Phone is invalid')
      }
      const paymentMethod = cleanText(
        input.paymentMethod,
        'Payment method',
        100,
        false,
      )
      return { name: name ?? '', phone, paymentMethod }
    },
  )
  .handler(async ({ data }) => {
    const { barberId } = await requireBarber()
    const [updated] = await db
      .update(barbers)
      .set({
        name: data.name,
        phone: data.phone,
        paymentMethod: data.paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(barbers.id, barberId))
      .returning()
    if (!updated) throw new Error('Barber not found')
    return {
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      paymentMethod: updated.paymentMethod,
    }
  })

export const setBarberAppointmentStatus = createServerFn({ method: 'POST' })
  .validator(
    (input: { appointmentId: string; status: string; detail?: string }) => {
      const appointmentId = requireUuid(input.appointmentId, 'Appointment id')
      if (!isBarberTargetStatus(input.status)) {
        throw new Error('Invalid appointment status')
      }
      const detail = cleanText(input.detail, 'Detail', 300, false)
      return { appointmentId, status: input.status, detail }
    },
  )
  .handler(async ({ data }) => {
    const { user, barberId } = await requireBarber()

    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, data.appointmentId),
        eq(appointments.barberId, barberId),
      ),
    })
    if (!appointment) {
      throw new Error('Appointment not found')
    }

    const current = appointment.status ?? 'pending'
    if (!canBarberTransition(current, data.status)) {
      throw new Error(
        `Cannot change appointment status from ${current} to ${data.status}`,
      )
    }

    const started = appointment.startsAt.getTime() <= Date.now()
    if (data.status === 'cancelled' && started) {
      throw new Error('Past appointments cannot be cancelled')
    }
    if (
      (data.status === 'completed' || data.status === 'no_show') &&
      !started
    ) {
      throw new Error('Appointment has not started yet')
    }

    const [updated] = await db
      .update(appointments)
      .set({ status: data.status, updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, data.appointmentId),
          eq(appointments.barberId, barberId),
          eq(appointments.status, current),
        ),
      )
      .returning()

    if (!updated) {
      throw new Error('Appointment status changed, please refresh')
    }
    await logAppointmentEvent({
      appointmentId: updated.id,
      actorId: user.id,
      actorRole: 'barber',
      action: data.status,
      detail: data.detail ?? undefined,
    })
    return updated
  })

async function loadReschedulable(appointmentId: string, barberId: string) {
  const appointment = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.id, appointmentId),
      eq(appointments.barberId, barberId),
    ),
  })
  if (!appointment) throw new Error('Appointment not found')
  const status = appointment.status ?? 'pending'
  if (status !== 'pending' && status !== 'confirmed') {
    throw new Error('Only active appointments can be rescheduled')
  }
  if (appointment.startsAt.getTime() <= Date.now()) {
    throw new Error('Past appointments cannot be rescheduled')
  }
  return appointment
}

async function freeSlots(
  barberId: string,
  appointment: { id: string; startsAt: Date; endsAt: Date },
  dateKey: string,
) {
  const durationMinutes = Math.round(
    (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / MINUTE_MS,
  )
  const range = dayRangeUtc(dateKey)
  const [windows, busy] = await Promise.all([
    db.query.availability.findMany({
      where: and(
        eq(availability.barberId, barberId),
        eq(availability.isActive, true),
      ),
    }),
    db.query.appointments.findMany({
      where: and(
        eq(appointments.barberId, barberId),
        ne(appointments.id, appointment.id),
        inArray(appointments.status, ['pending', 'confirmed']),
        lt(appointments.startsAt, range.end),
        gt(appointments.endsAt, range.start),
      ),
    }),
  ])
  return {
    durationMinutes,
    slots: slotsForDate(
      dateKey,
      windows,
      busy.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
      durationMinutes,
      new Date(),
    ),
  }
}

export const getRescheduleSlots = createServerFn({ method: 'GET' })
  .validator((input: { appointmentId: string; date: string }) => {
    const appointmentId = requireUuid(input.appointmentId, 'Appointment id')
    if (!isDateKey(input.date)) throw new Error('Invalid date')
    return { appointmentId, date: input.date }
  })
  .handler(async ({ data }) => {
    const { barberId } = await requireBarber()
    const appointment = await loadReschedulable(data.appointmentId, barberId)
    const { slots } = await freeSlots(barberId, appointment, data.date)
    return slots
  })

export const rescheduleBarberAppointment = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string; startsAt: string }) => {
    const appointmentId = requireUuid(input.appointmentId, 'Appointment id')
    if (
      typeof input.startsAt !== 'string' ||
      Number.isNaN(new Date(input.startsAt).getTime())
    ) {
      throw new Error('Invalid start time')
    }
    return { appointmentId, startsAt: new Date(input.startsAt).toISOString() }
  })
  .handler(async ({ data }) => {
    const { user, barberId } = await requireBarber()
    const appointment = await loadReschedulable(data.appointmentId, barberId)
    const newStart = new Date(data.startsAt)
    const { durationMinutes, slots } = await freeSlots(
      barberId,
      appointment,
      toDateKey(newStart),
    )
    if (!slots.includes(newStart.toISOString())) {
      throw new Error('Selected time is not available')
    }
    const newEnd = new Date(newStart.getTime() + durationMinutes * MINUTE_MS)

    const [updated] = await db
      .update(appointments)
      .set({ startsAt: newStart, endsAt: newEnd, updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointment.id),
          eq(appointments.barberId, barberId),
          eq(appointments.startsAt, appointment.startsAt),
        ),
      )
      .returning()
    if (!updated) throw new Error('Appointment changed, please refresh')

    await logAppointmentEvent({
      appointmentId: updated.id,
      actorId: user.id,
      actorRole: 'barber',
      action: 'rescheduled',
      detail: `${appointment.startsAt.toISOString()} -> ${newStart.toISOString()}`,
    })
    return updated
  })
