import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  APPOINTMENT_STATUSES,
  BARBER_TARGET_STATUSES,
  canBarberTransition,
  canTransition,
  isActiveStatus,
  isAppointmentStatus,
  isBarberTargetStatus,
} from './appointment-status.ts'

describe('status guards', () => {
  it('recognises valid statuses only', () => {
    for (const s of APPOINTMENT_STATUSES)
      assert.equal(isAppointmentStatus(s), true)
    assert.equal(isAppointmentStatus('done'), false)
    assert.equal(isAppointmentStatus(undefined), false)
  })
  it('pending is never a barber target', () => {
    assert.equal(isBarberTargetStatus('pending'), false)
    for (const s of BARBER_TARGET_STATUSES)
      assert.equal(isBarberTargetStatus(s), true)
  })
  it('active statuses are pending and confirmed', () => {
    assert.equal(isActiveStatus('pending'), true)
    assert.equal(isActiveStatus('confirmed'), true)
    assert.equal(isActiveStatus('no_show'), false)
  })
})

describe('canTransition', () => {
  it('allows the documented flow', () => {
    assert.equal(canTransition('pending', 'confirmed'), true)
    assert.equal(canTransition('pending', 'cancelled'), true)
    assert.equal(canTransition('confirmed', 'completed'), true)
    assert.equal(canTransition('confirmed', 'cancelled'), true)
  })
  it('blocks invalid and terminal transitions', () => {
    assert.equal(canTransition('pending', 'completed'), false)
    for (const from of ['cancelled', 'completed', 'no_show'] as const) {
      for (const to of APPOINTMENT_STATUSES)
        assert.equal(canTransition(from, to), false)
    }
  })
})

describe('canBarberTransition', () => {
  it('lets a barber confirm pending and close open appointments', () => {
    assert.equal(canBarberTransition('pending', 'confirmed'), true)
    assert.equal(canBarberTransition('confirmed', 'completed'), true)
    assert.equal(canBarberTransition('confirmed', 'no_show'), true)
    assert.equal(canBarberTransition('pending', 'cancelled'), true)
  })
  it('rejects changes on closed appointments and re-confirming', () => {
    assert.equal(canBarberTransition('confirmed', 'confirmed'), false)
    for (const from of ['cancelled', 'completed', 'no_show'] as const) {
      for (const to of BARBER_TARGET_STATUSES)
        assert.equal(canBarberTransition(from, to), false)
    }
  })
})
