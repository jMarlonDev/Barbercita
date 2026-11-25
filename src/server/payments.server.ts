import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointments, payments } from '@/db/schema'
import {
  getWompiApiUrl,
  mapWompiStatus,
  verifyEventChecksum,
} from '@/lib/wompi'
import type { PaymentStatus } from '@/lib/wompi'

export function getWompiConfig() {
  const publicKey = process.env.WOMPI_PUBLIC_KEY
  const eventsKey = process.env.WOMPI_EVENTS_KEY
  const integrityKey = process.env.WOMPI_INTEGRITY_KEY

  if (!publicKey || !eventsKey || !integrityKey) {
    throw new Error('Missing WOMPI_* env vars')
  }

  return {
    publicKey,
    eventsKey,
    integrityKey,
    apiUrl: getWompiApiUrl(process.env.WOMPI_ENV),
  }
}

interface WompiTransaction {
  id: string
  reference: string
  status: string
  amount_in_cents: number
}

function parseTransaction(value: unknown): WompiTransaction | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const { id, reference, status, amount_in_cents } = value as Record<
    string,
    unknown
  >
  return typeof id === 'string' &&
    typeof reference === 'string' &&
    typeof status === 'string' &&
    typeof amount_in_cents === 'number'
    ? { id, reference, status, amount_in_cents }
    : null
}

/**
 * Idempotently record a Wompi transaction. The amount must match what we
 * charged; an approved payment confirms a still-pending appointment.
 * Returns null when the reference is unknown.
 */
export async function applyTransaction(
  transaction: WompiTransaction,
): Promise<{ status: PaymentStatus; appointmentId: string } | null> {
  return db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({
      where: eq(payments.reference, transaction.reference),
    })

    if (!payment || payment.amountInCents !== transaction.amount_in_cents) {
      return null
    }

    // Never downgrade a payment that was already approved.
    const status =
      payment.status === 'approved'
        ? 'approved'
        : mapWompiStatus(transaction.status)

    await tx
      .update(payments)
      .set({
        status,
        wompiTransactionId: transaction.id,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))

    if (status === 'approved') {
      await tx
        .update(appointments)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(
          and(
            eq(appointments.id, payment.appointmentId),
            eq(appointments.status, 'pending'),
          ),
        )
    }

    return { status, appointmentId: payment.appointmentId }
  })
}

/** Fetch the authoritative transaction state from Wompi. */
export async function fetchTransaction(
  transactionId: string,
): Promise<WompiTransaction> {
  const { apiUrl } = getWompiConfig()
  const response = await fetch(
    `${apiUrl}/transactions/${encodeURIComponent(transactionId)}`,
  )
  if (!response.ok) {
    throw new Error('Transaction not found')
  }
  const body = (await response.json()) as { data?: unknown }
  const transaction = parseTransaction(body.data)
  if (!transaction) {
    throw new Error('Invalid transaction response')
  }
  return transaction
}

/** Webhook entry point: verify the signature, then apply `transaction.updated`. */
export async function handleWompiEvent(rawBody: string): Promise<boolean> {
  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return false
  }

  if (!verifyEventChecksum(event, getWompiConfig().eventsKey)) {
    return false
  }

  const { event: name, data } = event as {
    event?: unknown
    data?: { transaction?: unknown }
  }
  if (name === 'transaction.updated') {
    const transaction = parseTransaction(data?.transaction)
    if (transaction) {
      await applyTransaction(transaction)
    }
  }
  return true
}
