import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { barbers } from '@/db/schema'

export const getBarbers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const result = await db.query.barbers.findMany({
      where: eq(barbers.isActive, true),
      orderBy: (b, { asc }) => [asc(b.name)],
    })
    return result
  },
)

export const getBarberById = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const result = await db.query.barbers.findFirst({
      where: eq(barbers.id, data.id),
    })
    return result ?? null
  })
