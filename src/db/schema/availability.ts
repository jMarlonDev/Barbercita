import {
  boolean,
  integer,
  pgTable,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { barbers } from './barbers'

export const availability = pgTable(
  'availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barberId: uuid('barber_id')
      .notNull()
      .references(() => barbers.id),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('availability_barber_day_start_unique').on(
      table.barberId,
      table.dayOfWeek,
      table.startTime,
    ),
  ],
)

export const availabilityRelations = relations(availability, ({ one }) => ({
  barber: one(barbers, {
    fields: [availability.barberId],
    references: [barbers.id],
  }),
}))

export type Availability = typeof availability.$inferSelect
export type NewAvailability = typeof availability.$inferInsert
