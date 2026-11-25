import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dayRangeUtc,
  isDateKey,
  listDateKeys,
  slotsForDate,
  toDateKey,
} from './availability.ts'

// 2030-01-07 is a Monday (dayOfWeek 1). Business time is UTC-5.
const MONDAY = '2030-01-07'
const WINDOWS = [{ dayOfWeek: 1, startTime: '09:00:00', endTime: '11:00:00' }]
const PAST = new Date('2020-01-01T00:00:00Z')

describe('slotsForDate', () => {
  it('generates 30-minute steps that fit the service duration', () => {
    const slots = slotsForDate(MONDAY, WINDOWS, [], 60, PAST)
    // 09:00, 09:30, 10:00 local = 14:00, 14:30, 15:00 UTC
    assert.deepEqual(slots, [
      '2030-01-07T14:00:00.000Z',
      '2030-01-07T14:30:00.000Z',
      '2030-01-07T15:00:00.000Z',
    ])
  })

  it('returns nothing on days without a window', () => {
    assert.deepEqual(slotsForDate('2030-01-08', WINDOWS, [], 30, PAST), [])
  })

  it('removes slots overlapping an active appointment', () => {
    const busy = [
      {
        startsAt: new Date('2030-01-07T14:30:00Z'),
        endsAt: new Date('2030-01-07T15:00:00Z'),
      },
    ]
    const slots = slotsForDate(MONDAY, WINDOWS, busy, 60, PAST)
    assert.deepEqual(slots, ['2030-01-07T15:00:00.000Z'])
    const short = slotsForDate(MONDAY, WINDOWS, busy, 30, PAST)
    assert.deepEqual(short, [
      '2030-01-07T14:00:00.000Z',
      '2030-01-07T15:00:00.000Z',
      '2030-01-07T15:30:00.000Z',
    ])
  })

  it('hides slots that are not in the future', () => {
    const now = new Date('2030-01-07T14:30:00Z')
    const slots = slotsForDate(MONDAY, WINDOWS, [], 30, now)
    assert.deepEqual(slots, [
      '2030-01-07T15:00:00.000Z',
      '2030-01-07T15:30:00.000Z',
    ])
  })

  it('merges overlapping windows without duplicates', () => {
    const windows = [
      ...WINDOWS,
      { dayOfWeek: 1, startTime: '10:00:00', endTime: '12:00:00' },
    ]
    const slots = slotsForDate(MONDAY, windows, [], 30, PAST)
    assert.equal(slots.length, new Set(slots).size)
    assert.equal(slots.length, 6)
  })
})

describe('date helpers', () => {
  it('maps UTC instants to the business-local date', () => {
    assert.equal(toDateKey(new Date('2030-01-08T03:00:00Z')), '2030-01-07')
    assert.equal(toDateKey(new Date('2030-01-08T05:00:00Z')), '2030-01-08')
  })

  it('computes the UTC range of a business day', () => {
    const { start, end } = dayRangeUtc(MONDAY)
    assert.equal(start.toISOString(), '2030-01-07T05:00:00.000Z')
    assert.equal(end.toISOString(), '2030-01-08T05:00:00.000Z')
  })

  it('validates date keys and ranges', () => {
    assert.equal(isDateKey('2030-02-30'), false)
    assert.equal(isDateKey('30-02-2030'), false)
    assert.equal(isDateKey(MONDAY), true)
    assert.deepEqual(listDateKeys('2030-01-30', '2030-02-01'), [
      '2030-01-30',
      '2030-01-31',
      '2030-02-01',
    ])
    assert.throws(() => listDateKeys('2030-02-02', '2030-02-01'))
  })
})
