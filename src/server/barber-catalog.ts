import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { barberServices, services } from '@/db/schema'
import { isUuid } from '@/lib/validation'
import { requireRole } from '@/server/auth.server'

const MAX_PRICE = 99_999_999

interface ServiceInput {
  name: string
  description?: string | null
  durationMinutes: number
  price: number
  isActive: boolean
}

async function requireBarber() {
  const user = await requireRole(['barber'])
  if (!user.barberId) throw new Error('Forbidden')
  return user.barberId
}

function parseServiceInput(input: ServiceInput) {
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('Name is required')
  }
  const name = input.name.trim()
  if (name.length > 100) throw new Error('Name is too long')
  let description: string | null = null
  if (typeof input.description === 'string' && input.description.trim()) {
    description = input.description.trim()
    if (description.length > 500) throw new Error('Description is too long')
  }
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 5 ||
    input.durationMinutes > 480
  ) {
    throw new Error('Duration must be between 5 and 480 minutes')
  }
  if (
    typeof input.price !== 'number' ||
    !Number.isFinite(input.price) ||
    input.price < 0 ||
    input.price > MAX_PRICE
  ) {
    throw new Error('Price is invalid')
  }
  if (typeof input.isActive !== 'boolean') throw new Error('Invalid status')
  return {
    name,
    description,
    durationMinutes: input.durationMinutes,
    price: input.price.toFixed(2),
    isActive: input.isActive,
  }
}

export const getBarberServices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const barberId = await requireBarber()
    return db.query.services.findMany({
      where: eq(services.ownerBarberId, barberId),
      orderBy: [asc(services.name)],
    })
  },
)

export const createBarberService = createServerFn({ method: 'POST' })
  .validator(parseServiceInput)
  .handler(async ({ data }) => {
    const barberId = await requireBarber()
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(services)
        .values({ ...data, ownerBarberId: barberId })
        .returning()
      if (!created) throw new Error('Could not create service')
      await tx
        .insert(barberServices)
        .values({ barberId, serviceId: created.id })
      return created
    })
  })

export const updateBarberService = createServerFn({ method: 'POST' })
  .validator((input: ServiceInput & { id: string }) => {
    if (typeof input.id !== 'string' || !isUuid(input.id)) {
      throw new Error('Service id must be a valid UUID')
    }
    return { id: input.id, ...parseServiceInput(input) }
  })
  .handler(async ({ data }) => {
    const barberId = await requireBarber()
    const { id, ...values } = data
    const [updated] = await db
      .update(services)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(services.id, id), eq(services.ownerBarberId, barberId)))
      .returning()
    if (!updated) throw new Error('Service not found')
    return updated
  })
