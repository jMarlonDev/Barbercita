import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { availability } from '@/db/schema'

export const getBarberAvailability = createServerFn({ method: 'GET' })
  .validator((input: { barberId: string }) => input)
  .handler(async ({ data }) => {
    const result = await db.query.availability.findMany({
      where: eq(availability.barberId, data.barberId),
      orderBy: (a, { asc }) => [asc(a.dayOfWeek), asc(a.startTime)],
    })
    return result
  })
