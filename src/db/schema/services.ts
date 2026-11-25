import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { barberServices } from './barber-services'
import { appointments } from './appointments'

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  /** Barber who created it (barber-owned catalog); null = global/admin. */
  ownerBarberId: uuid('owner_barber_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const servicesRelations = relations(services, ({ many }) => ({
  barberServices: many(barberServices),
  appointments: many(appointments),
}))

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
