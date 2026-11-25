import {
  integer,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { barbers } from './barbers'
import { services } from './services'

export const barberServices = pgTable(
  'barber_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barberId: uuid('barber_id')
      .notNull()
      .references(() => barbers.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    customPrice: numeric('custom_price', { precision: 10, scale: 2 }),
    customDuration: integer('custom_duration'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('barber_services_barber_service_unique').on(
      table.barberId,
      table.serviceId,
    ),
  ],
)

export const barberServicesRelations = relations(barberServices, ({ one }) => ({
  barber: one(barbers, {
    fields: [barberServices.barberId],
    references: [barbers.id],
  }),
  service: one(services, {
    fields: [barberServices.serviceId],
    references: [services.id],
  }),
}))

export type BarberService = typeof barberServices.$inferSelect
export type NewBarberService = typeof barberServices.$inferInsert
