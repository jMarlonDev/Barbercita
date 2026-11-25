import { db } from '@/db/client'
import { appointmentEvents } from '@/db/schema'

export type EventAction =
  | 'created'
  | 'rescheduled'
  | 'cancelled'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'paid'

/** Records a change on an appointment (activity log). Server-only. */
export async function logAppointmentEvent(input: {
  appointmentId: string
  actorId: string | null
  actorRole: 'admin' | 'barber' | 'customer' | 'system'
  action: EventAction
  detail?: string
}): Promise<void> {
  await db.insert(appointmentEvents).values({
    appointmentId: input.appointmentId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    detail: input.detail ?? null,
  })
}
