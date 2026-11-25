import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  barberShareCents,
  computeFinance,
  presetRange,
  validateHours,
  validatePayout,
} from './finance.ts'

describe('finance', () => {
  it('computes barber share with rounding', () => {
    assert.equal(barberShareCents(100_000, 30), 70_000)
    assert.equal(barberShareCents(333, 30), 233)
  })

  it('computes totals, pending and net balance', () => {
    const s = computeFinance(
      [
        {
          barberId: 'a',
          name: 'A',
          collectedCents: 100_000,
          paidOutCents: 20_000,
        },
        {
          barberId: 'b',
          name: 'B',
          collectedCents: 50_000,
          paidOutCents: 40_000,
        },
      ],
      30,
    )
    assert.equal(s.collectedCents, 150_000)
    assert.equal(s.barberShareCents, 105_000)
    assert.equal(s.pendingCents, 50_000)
    assert.equal(s.netBalanceCents, 45_000)
    assert.equal(s.rows[1]?.pendingCents, 0)
    assert.equal(s.rows[1].overpaidCents, 5_000)
  })

  it('validates payouts', () => {
    assert.equal(validatePayout(100, 100), null)
    assert.notEqual(validatePayout(101, 100), null)
    assert.notEqual(validatePayout(0, 100), null)
  })

  it('builds preset ranges', () => {
    assert.deepEqual(presetRange('week', '2026-11-25'), {
      from: '2026-11-23',
      to: '2026-11-29',
    })
    assert.deepEqual(presetRange('month', '2026-02-10'), {
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('validates hours', () => {
    assert.equal(validateHours('09:00', '19:00'), null)
    assert.notEqual(validateHours('19:00', '09:00'), null)
    assert.notEqual(validateHours('9:00', '19:00'), null)
  })
})
