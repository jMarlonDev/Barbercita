import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { barbers } from './barbers'
import { customers } from './customers'
import { payments } from './payments'
import { services } from './services'

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barberId: uuid('barber_id')
      .notNull()
      .references(() => barbers.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    status: appointmentStatusEnum('status').default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('appointments_barber_id_idx').on(table.barberId),
    index('appointments_customer_id_idx').on(table.customerId),
    index('appointments_starts_at_idx').on(table.startsAt),
    index('appointments_barber_starts_at_idx').on(
      table.barberId,
      table.startsAt,
    ),
  ],
)

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    payments: many(payments),
    barber: one(barbers, {
      fields: [appointments.barberId],
      references: [barbers.id],
    }),
    customer: one(customers, {
      fields: [appointments.customerId],
      references: [customers.id],
    }),
    service: one(services, {
      fields: [appointments.serviceId],
      references: [services.id],
    }),
  }),
)

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
