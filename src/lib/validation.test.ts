import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  asRecord,
  isUuid,
  optionalText,
  requireBoolean,
  requireInstant,
  requiredText,
  requireUuid,
} from './validation.ts'

const UUID = '123e4567-e89b-42d3-a456-426614174000'

describe('uuid', () => {
  it('accepts valid and rejects invalid values', () => {
    assert.equal(isUuid(UUID), true)
    assert.equal(isUuid('nope'), false)
    assert.equal(isUuid(42), false)
    assert.equal(requireUuid(UUID, 'id'), UUID)
    assert.throws(() => requireUuid('x', 'barberId'), /barberId must be/)
  })
})

describe('asRecord', () => {
  it('only accepts plain objects', () => {
    assert.deepEqual(asRecord({ a: 1 }), { a: 1 })
    assert.throws(() => asRecord(null))
    assert.throws(() => asRecord([]))
    assert.throws(() => asRecord('x'))
  })
})

describe('requireInstant', () => {
  it('parses ISO strings and rejects garbage', () => {
    assert.equal(
      requireInstant('2026-01-01T10:00:00Z', 'startsAt').toISOString(),
      '2026-01-01T10:00:00.000Z',
    )
    assert.throws(() => requireInstant('mañana', 'startsAt'))
    assert.throws(() => requireInstant(123, 'startsAt'))
  })
})

describe('text helpers', () => {
  it('requiredText trims and enforces bounds', () => {
    assert.equal(requiredText('  Hola ', 'name', 10), 'Hola')
    assert.throws(() => requiredText('   ', 'name', 10))
    assert.throws(() => requiredText('x'.repeat(11), 'name', 10))
    assert.throws(() => requiredText(5, 'name', 10))
  })
  it('optionalText returns null for empty values', () => {
    assert.equal(optionalText(undefined, 'bio', 5), null)
    assert.equal(optionalText(null, 'bio', 5), null)
    assert.equal(optionalText('', 'bio', 5), null)
    assert.equal(optionalText(' ok ', 'bio', 5), 'ok')
    assert.throws(() => optionalText('muy largo', 'bio', 5))
  })
  it('requireBoolean is strict', () => {
    assert.equal(requireBoolean(false, 'active'), false)
    assert.throws(() => requireBoolean('true', 'active'))
  })
})
