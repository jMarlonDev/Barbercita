import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { appointments } from './appointments'

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'approved',
  'declined',
  'voided',
  'error',
])

/** One row per Wompi checkout attempt for an appointment. */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    reference: varchar('reference', { length: 64 }).unique().notNull(),
    amountInCents: integer('amount_in_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('COP'),
    status: paymentStatusEnum('status').notNull().default('pending'),
    wompiTransactionId: varchar('wompi_transaction_id', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('payments_appointment_id_idx').on(table.appointmentId)],
)

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}))

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
