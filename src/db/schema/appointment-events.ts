import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { appointments } from './appointments'

/** Activity log: one row per change made to an appointment. */
export const appointmentEvents = pgTable(
  'appointment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    actorId: uuid('actor_id'),
    actorRole: varchar('actor_role', { length: 20 }).notNull(),
    /** created | rescheduled | cancelled | confirmed | completed | no_show | paid */
    action: varchar('action', { length: 30 }).notNull(),
    detail: text('detail'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('appointment_events_appt_idx').on(table.appointmentId)],
)

export type AppointmentEvent = typeof appointmentEvents.$inferSelect
