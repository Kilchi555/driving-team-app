import { describe, expect, it } from 'vitest'
import {
  belongsToCustomerTenant,
  filterUpcomingCustomerAppointments,
  isUpcomingCustomerAppointment,
  isVisibleCustomerAppointment,
} from '~/utils/customer-appointment-visibility'
import {
  filterOccupyingAppointments,
  occupiesScheduleSlot,
  participatesInCustomerConflict,
} from '~/utils/appointment-schedule-occupancy'
import {
  canReleaseUnpaidHold,
  shouldHoldAppointmentUntilPaid,
} from '../pay-before-confirm'

const NOW = new Date('2026-09-09T10:00:00.000Z')
const FUTURE = '2026-09-15T10:00:00.000Z'
const PAST = '2026-09-01T10:00:00.000Z'

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'

describe('cancelled appointments must never behave as active', () => {
  it('Test 1: cancelled + deleted_at NULL + future is NOT customer-visible upcoming', () => {
    expect(isUpcomingCustomerAppointment({
      status: 'cancelled',
      deleted_at: null,
      start_time: FUTURE,
    }, NOW)).toBe(false)
    expect(isVisibleCustomerAppointment({
      status: 'cancelled',
      deleted_at: null,
      start_time: FUTURE,
    })).toBe(false)
  })

  it('Test 2: cancelled + deleted_at NULL is NOT a customer conflict', () => {
    expect(participatesInCustomerConflict({
      status: 'cancelled',
      deleted_at: null,
    })).toBe(false)

    const window = [
      { id: 'ghost', status: 'cancelled', deleted_at: null, start_time: FUTURE },
      { id: 'live', status: 'confirmed', deleted_at: null, start_time: FUTURE },
    ]
    expect(filterOccupyingAppointments(window).map((r) => r.id)).toEqual(['live'])
  })

  it('Test 3: cancelled + deleted_at NULL does NOT block availability', () => {
    expect(occupiesScheduleSlot({
      status: 'cancelled',
      deleted_at: null,
    })).toBe(false)
  })

  it('Test 4: confirmed + deleted_at NULL still blocks availability', () => {
    expect(occupiesScheduleSlot({
      status: 'confirmed',
      deleted_at: null,
    })).toBe(true)
  })

  it('Test 5: confirmed + deleted_at NULL remains customer-visible upcoming', () => {
    expect(isUpcomingCustomerAppointment({
      status: 'confirmed',
      deleted_at: null,
      start_time: FUTURE,
    }, NOW)).toBe(true)
  })

  it('Test 6: soft-deleted appointment remains excluded (existing deletion semantics)', () => {
    expect(isVisibleCustomerAppointment({
      status: 'confirmed',
      deleted_at: '2026-08-29T20:48:00.000Z',
      start_time: FUTURE,
    })).toBe(false)
    expect(occupiesScheduleSlot({
      status: 'confirmed',
      deleted_at: '2026-08-29T20:48:00.000Z',
    })).toBe(false)
  })

  it('Test 7: confirmed + payment pending remains a valid active booking (no payment coupling)', () => {
    const confirmedUnpaid = {
      status: 'confirmed',
      deleted_at: null,
      start_time: FUTURE,
      payment_status: 'pending',
      pay_before_confirm: false,
    }
    expect(isUpcomingCustomerAppointment(confirmedUnpaid, NOW)).toBe(true)
    expect(occupiesScheduleSlot(confirmedUnpaid)).toBe(true)
    // Setting false must not create a hold
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: false,
      paymentMethod: 'wallee',
      amountRappen: 12665,
    })).toBe(false)
  })

  it('Test 8: unpaid pay_before_confirm hold release eligibility is unchanged', () => {
    expect(canReleaseUnpaidHold([{
      payment_status: 'pending',
      metadata: { pay_before_confirm: true },
    }])).toBe(true)
    expect(canReleaseUnpaidHold([{
      payment_status: 'pending',
      metadata: {},
    }])).toBe(false)
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: true,
      paymentMethod: 'wallee',
      amountRappen: 12665,
    })).toBe(true)
  })

  it('incident scenario: cancelled online hold with deleted_at NULL is ghost-free', () => {
    const dilaraGhost = {
      id: 'cef59877-917d-4b09-abd8-00458f80adb2',
      status: 'cancelled',
      deleted_at: null,
      source: 'online',
      start_time: FUTURE,
      payment_status: 'cancelled',
      pay_before_confirm: true,
    }

    expect(filterUpcomingCustomerAppointments([dilaraGhost], NOW)).toEqual([])
    expect(participatesInCustomerConflict(dilaraGhost)).toBe(false)
    expect(occupiesScheduleSlot(dilaraGhost)).toBe(false)
  })

  it('pending appointments still occupy schedule and can appear upcoming', () => {
    const pending = {
      status: 'pending',
      deleted_at: null,
      start_time: FUTURE,
    }
    expect(occupiesScheduleSlot(pending)).toBe(true)
    expect(isUpcomingCustomerAppointment(pending, NOW)).toBe(true)
  })

  it('tenant isolation helper still rejects foreign rows', () => {
    const own = {
      status: 'confirmed',
      deleted_at: null,
      start_time: FUTURE,
      user_id: USER_A,
      tenant_id: TENANT_A,
    }
    expect(belongsToCustomerTenant(own, { userId: USER_A, tenantId: TENANT_A })).toBe(true)
    expect(belongsToCustomerTenant({ ...own, user_id: USER_B }, { userId: USER_A, tenantId: TENANT_A })).toBe(false)
    expect(belongsToCustomerTenant({ ...own, tenant_id: TENANT_B }, { userId: USER_A, tenantId: TENANT_A })).toBe(false)
  })

  it('past confirmed lessons are not upcoming', () => {
    expect(isUpcomingCustomerAppointment({
      status: 'confirmed',
      deleted_at: null,
      start_time: PAST,
    }, NOW)).toBe(false)
  })
})
