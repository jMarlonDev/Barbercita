import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  buildCheckoutUrl,
  integritySignature,
  mapWompiStatus,
  toAmountInCents,
  verifyEventChecksum,
} from './wompi.ts'

const sha = (v: string) => createHash('sha256').update(v).digest('hex')

describe('wompi helpers', () => {
  it('converts COP prices to cents', () => {
    assert.equal(toAmountInCents('25000.00'), 2500000)
    assert.equal(toAmountInCents('18000'), 1800000)
  })

  it('builds the integrity signature from reference, cents, currency, key', () => {
    assert.equal(
      integritySignature('ref-1', 2500000, 'COP', 'secret'),
      sha('ref-12500000COPsecret'),
    )
  })

  it('builds a checkout url with the signature', () => {
    const url = new URL(
      buildCheckoutUrl({
        publicKey: 'pub',
        reference: 'ref-1',
        amountInCents: 2500000,
        integrityKey: 'secret',
        redirectUrl: 'http://localhost:3000/pago/resultado',
      }),
    )
    assert.equal(url.searchParams.get('amount-in-cents'), '2500000')
    assert.equal(
      url.searchParams.get('signature:integrity'),
      sha('ref-12500000COPsecret'),
    )
  })

  it('maps statuses and defaults unknown ones to error', () => {
    assert.equal(mapWompiStatus('APPROVED'), 'approved')
    assert.equal(mapWompiStatus('PENDING'), 'pending')
    assert.equal(mapWompiStatus('???'), 'error')
  })

  it('verifies event checksums', () => {
    const data = {
      transaction: { id: 'tx1', status: 'APPROVED', amount_in_cents: 100 },
    }
    const properties = [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ]
    const timestamp = 1700000000
    const event = {
      data,
      timestamp,
      signature: {
        properties,
        checksum: sha(`tx1APPROVED100${timestamp}evkey`),
      },
    }
    assert.equal(verifyEventChecksum(event, 'evkey'), true)
    assert.equal(verifyEventChecksum(event, 'other'), false)
    assert.equal(
      verifyEventChecksum(
        { ...event, data: { transaction: { id: 'x' } } },
        'evkey',
      ),
      false,
    )
    assert.equal(verifyEventChecksum(null, 'evkey'), false)
  })
})
