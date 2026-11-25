import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { barberServices, services } from '@/db/schema'

export const getServices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const result = await db.query.services.findMany({
      where: eq(services.isActive, true),
      orderBy: (s, { asc }) => [asc(s.name)],
    })
    return result
  },
)

export const getServicesByBarber = createServerFn({ method: 'GET' })
  .validator((input: { barberId: string }) => input)
  .handler(async ({ data }) => {
    const rows = await db.query.barberServices.findMany({
      where: eq(barberServices.barberId, data.barberId),
      with: {
        service: true,
      },
    })

    return rows
      .filter((row) => row.service.isActive)
      .map((row) => ({
        ...row.service,
        customPrice: row.customPrice,
        customDuration: row.customDuration,
        effectivePrice: row.customPrice ?? row.service.price,
        effectiveDuration: row.customDuration ?? row.service.durationMinutes,
      }))
  })
