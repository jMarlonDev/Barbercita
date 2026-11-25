import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, gte } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointments } from '@/db/schema'
import { dayRangeUtc, toDateKey } from '@/lib/availability'
import { requireRole } from '@/server/auth.server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Statuses a barber may set; `pending` and `cancelled`-reopening are excluded. */
const BARBER_TARGET_STATUSES = ['confirmed', 'completed', 'cancelled'] as const
type BarberTargetStatus = (typeof BARBER_TARGET_STATUSES)[number]

function isTargetStatus(value: unknown): value is BarberTargetStatus {
  return (
    typeof value === 'string' &&
    (BARBER_TARGET_STATUSES as ReadonlyArray<string>).includes(value)
  )
}

async function requireBarber() {
  const user = await requireRole(['barber'])
  if (!user.barberId) {
    throw new Error('Forbidden')
  }
  return { user, barberId: user.barberId }
}

/** Own appointments from the start of today (business time) onward. */
export const getBarberAgenda = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { barberId } = await requireBarber()
    const todayStart = dayRangeUtc(toDateKey(new Date())).start

    return db.query.appointments.findMany({
      where: and(
        eq(appointments.barberId, barberId),
        gte(appointments.startsAt, todayStart),
      ),
      with: { customer: true, service: true, payments: true },
      orderBy: [asc(appointments.startsAt)],
    })
  },
)

export const setBarberAppointmentStatus = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string; status: string }) => {
    if (
      typeof input.appointmentId !== 'string' ||
      !UUID_PATTERN.test(input.appointmentId)
    ) {
      throw new Error('Appointment id must be a valid UUID')
    }
    if (!isTargetStatus(input.status)) {
      throw new Error('Invalid appointment status')
    }
    return { appointmentId: input.appointmentId, status: input.status }
  })
  .handler(async ({ data }) => {
    const { barberId } = await requireBarber()

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
    const allowed =
      (current === 'pending' &&
        (data.status === 'confirmed' || data.status === 'cancelled')) ||
      (current === 'confirmed' &&
        (data.status === 'completed' || data.status === 'cancelled'))
    if (!allowed) {
      throw new Error(
        `Cannot change appointment status from ${current} to ${data.status}`,
      )
    }

    const now = Date.now()
    if (data.status === 'cancelled' && appointment.startsAt.getTime() <= now) {
      throw new Error('Past appointments cannot be cancelled')
    }
    if (data.status === 'completed' && appointment.startsAt.getTime() > now) {
      throw new Error('Future appointments cannot be completed yet')
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
    return updated
  })
