/**
 * Pure Wompi helpers (no network, no database). Server-side only: they use
 * `node:crypto` and receive the secret keys as arguments.
 */

import { createHash } from 'node:crypto'

export const WOMPI_CURRENCY = 'COP'
export const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/'

export type PaymentStatus =
  'pending' | 'approved' | 'declined' | 'voided' | 'error'

const STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  VOIDED: 'voided',
  ERROR: 'error',
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function mapWompiStatus(status: unknown): PaymentStatus {
  return (typeof status === 'string' && STATUS_MAP[status]) || 'error'
}

/** Wompi blocks redirects to loopback hosts, so only public origins are used. */
export function isPublicOrigin(origin: string): boolean {
  const { hostname } = new URL(origin)
  return !['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}

export function getWompiApiUrl(env: string | undefined): string {
  return env === 'prod' || env === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1'
}

/** Service price (COP, decimal string) to cents. */
export function toAmountInCents(price: string): number {
  return Math.round(Number(price) * 100)
}

/** `signature:integrity` for the checkout: sha256(ref + cents + currency + key). */
export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integrityKey: string,
): string {
  return sha256(`${reference}${amountInCents}${currency}${integrityKey}`)
}

export function buildCheckoutUrl(params: {
  publicKey: string
  reference: string
  amountInCents: number
  integrityKey: string
  /** Omit when the app is not publicly reachable: Wompi rejects localhost. */
  redirectUrl?: string
}): string {
  const query = new URLSearchParams({
    'public-key': params.publicKey,
    currency: WOMPI_CURRENCY,
    'amount-in-cents': String(params.amountInCents),
    reference: params.reference,
    'signature:integrity': integritySignature(
      params.reference,
      params.amountInCents,
      WOMPI_CURRENCY,
      params.integrityKey,
    ),
  })
  if (params.redirectUrl) {
    query.set('redirect-url', params.redirectUrl)
  }
  return `${WOMPI_CHECKOUT_URL}?${query.toString()}`
}

function readPath(source: unknown, path: string): string | null {
  let current = source
  for (const key of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return null
    }
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' || typeof current === 'number'
    ? String(current)
    : null
}

/**
 * Verify a Wompi event: sha256 of the values at `signature.properties`
 * (read from `data`), then `timestamp`, then the events key.
 */
export function verifyEventChecksum(
  event: unknown,
  eventsKey: string,
): boolean {
  if (typeof event !== 'object' || event === null) {
    return false
  }
  const { data, signature, timestamp } = event as {
    data?: unknown
    signature?: { properties?: unknown; checksum?: unknown }
    timestamp?: unknown
  }
  if (
    !Array.isArray(signature?.properties) ||
    typeof signature.checksum !== 'string' ||
    typeof timestamp !== 'number'
  ) {
    return false
  }

  const values: string[] = []
  for (const property of signature.properties) {
    const value = typeof property === 'string' ? readPath(data, property) : null
    if (value === null) {
      return false
    }
    values.push(value)
  }

  const expected = sha256(`${values.join('')}${timestamp}${eventsKey}`)
  return expected === signature.checksum.toLowerCase()
}
