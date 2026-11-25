import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { barbers } from './barbers'

/** Single-row system configuration (id is always 1). */
export const businessSettings = pgTable('business_settings', {
  id: integer('id').primaryKey().default(1),
  businessName: varchar('business_name', { length: 100 })
    .notNull()
    .default('BarberCita'),
  /** { "1": {"open":"09:00","close":"19:00"}, ... } keyed by day of week; absent = closed. */
  businessHours:
    jsonb('business_hours').$type<
      Record<string, { open: string; close: string }>
    >(),
  maxBarbers: integer('max_barbers').notNull().default(10),
  /** Share of each approved payment kept by the business (0-100). */
  commissionPercent: numeric('commission_percent', { precision: 5, scale: 2 })
    .notNull()
    .default('30'),
  /** Chair-rental fee per barber per month, in COP cents (0 = disabled). */
  chairRentCents: integer('chair_rent_cents').notNull().default(0),
  rulesNotes: text('rules_notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Settlements paid by the business to a barber. */
export const barberPayouts = pgTable(
  'barber_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barberId: uuid('barber_id')
      .notNull()
      .references(() => barbers.id),
    amountCents: integer('amount_cents').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('barber_payouts_barber_idx').on(table.barberId)],
)

export type BusinessSettings = typeof businessSettings.$inferSelect
export type BarberPayout = typeof barberPayouts.$inferSelect
