import { randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointments, barberServices, payments } from '@/db/schema'
import { buildCheckoutUrl, isPublicOrigin, toAmountInCents } from '@/lib/wompi'
import { requireRole } from '@/server/auth.server'
import {
  applyTransaction,
  fetchTransaction,
  fetchTransactionByReference,
  getWompiConfig,
} from '@/server/payments.server'

export const createPayment = createServerFn({ method: 'POST' })
  .validator((input: { appointmentId: string }) => {
    if (typeof input.appointmentId !== 'string') {
      throw new Error('Appointment id is required')
    }
    return { appointmentId: input.appointmentId }
  })
  .handler(async ({ data }): Promise<{ checkoutUrl: string }> => {
    const user = await requireRole(['customer'])

    const appointment = await db.query.appointments.findFirst({
      where: (a, { eq: equals }) => equals(a.id, data.appointmentId),
      with: { service: true, payments: true },
    })

    if (!appointment || appointment.customerId !== user.id) {
      throw new Error('Appointment not found')
    }
    if (
      appointment.status !== 'pending' ||
      appointment.startsAt.getTime() <= Date.now()
    ) {
      throw new Error('Only pending future appointments can be paid')
    }
    if (appointment.payments.some((p) => p.status === 'approved')) {
      throw new Error('Appointment is already paid')
    }

    const barberService = await db.query.barberServices.findFirst({
      where: and(
        eq(barberServices.barberId, appointment.barberId),
        eq(barberServices.serviceId, appointment.serviceId),
      ),
    })
    const amountInCents = toAmountInCents(
      barberService?.customPrice ?? appointment.service.price,
    )

    const reference = `bc-${randomUUID()}`
    await db.insert(payments).values({
      appointmentId: appointment.id,
      reference,
      amountInCents,
    })

    const { publicKey, integrityKey } = getWompiConfig()
    const origin = getRequestUrl({
      xForwardedHost: true,
      xForwardedProto: true,
    }).origin

    return {
      checkoutUrl: buildCheckoutUrl({
        publicKey,
        reference,
        amountInCents,
        integrityKey,
        redirectUrl: isPublicOrigin(origin)
          ? `${origin}/pago/resultado`
          : undefined,
      }),
    }
  })

/**
 * Reconcile the customer's pending payments by asking Wompi for transactions
 * with each reference. Covers environments without redirect or webhook.
 */
export const syncPendingPayments = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await requireRole(['customer'])
    const pending = await db
      .select({ reference: payments.reference })
      .from(payments)
      .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.customerId, user.id),
          eq(payments.status, 'pending'),
        ),
      )

    await Promise.allSettled(
      pending.map(async ({ reference }) => {
        const transaction = await fetchTransactionByReference(reference)
        if (transaction) {
          await applyTransaction(transaction)
        }
      }),
    )
  },
)

/** Called after the Wompi redirect; works without a public webhook. */
export const syncPayment = createServerFn({ method: 'POST' })
  .validator((input: { transactionId: string }) => {
    if (
      typeof input.transactionId !== 'string' ||
      !/^[\w-]{1,64}$/.test(input.transactionId)
    ) {
      throw new Error('Invalid transaction id')
    }
    return { transactionId: input.transactionId }
  })
  .handler(async ({ data }) => {
    const user = await requireRole(['customer'])
    const transaction = await fetchTransaction(data.transactionId)

    const owned = await db.query.payments.findFirst({
      where: eq(payments.reference, transaction.reference),
      with: { appointment: { columns: { customerId: true } } },
    })
    if (!owned || owned.appointment.customerId !== user.id) {
      throw new Error('Payment not found')
    }

    const result = await applyTransaction(transaction)
    if (!result) {
      throw new Error('Payment not found')
    }
    return result
  })
