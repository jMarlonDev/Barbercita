import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { barberServices } from './barber-services'
import { appointments } from './appointments'
import { availability } from './availability'

export const barbers = pgTable(
  'barbers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 20 }),
    bio: text('bio'),
    paymentMethod: varchar('payment_method', { length: 100 }),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('barbers_email_idx').on(table.email)],
)

export const barbersRelations = relations(barbers, ({ many }) => ({
  barberServices: many(barberServices),
  appointments: many(appointments),
  availability: many(availability),
}))

export type Barber = typeof barbers.$inferSelect
export type NewBarber = typeof barbers.$inferInsert
