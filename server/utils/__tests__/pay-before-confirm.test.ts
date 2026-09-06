import { describe, expect, it } from 'vitest'
import {
  canReleaseUnpaidHold,
  shouldConfirmHeldAppointmentFromPayments,
  shouldDeferConfirmationUntilPaid,
  shouldHoldAppointmentUntilPaid,
} from '../pay-before-confirm'
import { checkoutAppUrl, safeCheckoutReturnUrl } from '../wallee-appointment-checkout'

describe('shouldHoldAppointmentUntilPaid', () => {
  it('is off for every current tenant default', () => {
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: false,
      paymentMethod: 'wallee',
      amountRappen: 18000,
    })).toBe(false)
  })

  it('holds only paid online checkout when the admin flag is on', () => {
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: true,
      paymentMethod: 'wallee',
      amountRappen: 18000,
    })).toBe(true)
  })

  it('still confirms invoice and cash immediately', () => {
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: true,
      paymentMethod: 'invoice',
      amountRappen: 18000,
    })).toBe(false)
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: true,
      paymentMethod: 'cash',
      amountRappen: 18000,
    })).toBe(false)
  })

  it('does not hold free bookings', () => {
    expect(shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: true,
      paymentMethod: 'wallee',
      amountRappen: 0,
    })).toBe(false)
  })
})

describe('canReleaseUnpaidHold', () => {
  it('never releases appointments without a pay-before-confirm payment', () => {
    expect(canReleaseUnpaidHold([])).toBe(false)
    expect(canReleaseUnpaidHold([{ payment_status: 'pending', metadata: {} }])).toBe(false)
  })

  it('releases only unpaid hold checkouts', () => {
    expect(canReleaseUnpaidHold([{
      payment_status: 'pending',
      metadata: { pay_before_confirm: true },
    }])).toBe(true)
  })

  it('never releases a hold while checkout recovery is pending', () => {
    expect(canReleaseUnpaidHold([{
      payment_status: 'pending',
      metadata: { pay_before_confirm: true },
      checkout_status: 'recovery_pending',
    }])).toBe(false)
    expect(canReleaseUnpaidHold([{
      payment_status: 'pending',
      metadata: { pay_before_confirm: true },
      wallee_transaction_id: '123',
    }])).toBe(false)
  })

  it('never releases a hold that already captured or locked money', () => {
    expect(canReleaseUnpaidHold([{
      payment_status: 'completed',
      metadata: { pay_before_confirm: true },
    }])).toBe(false)
    expect(canReleaseUnpaidHold([{
      payment_status: 'authorized',
      metadata: { pay_before_confirm: true },
    }])).toBe(false)
    expect(canReleaseUnpaidHold([{
      payment_status: 'processing',
      metadata: { pay_before_confirm: true },
    }])).toBe(false)
  })
})

describe('shouldConfirmHeldAppointmentFromPayments', () => {
  it('confirms when the hold payment already succeeded', () => {
    expect(shouldConfirmHeldAppointmentFromPayments([{
      payment_status: 'completed',
      metadata: { pay_before_confirm: true },
    }])).toBe('completed')
  })

  it('ignores completed payments that are not pay-before-confirm holds', () => {
    expect(shouldConfirmHeldAppointmentFromPayments([{
      payment_status: 'completed',
      metadata: {},
    }])).toBe(null)
  })
})

describe('shouldDeferConfirmationUntilPaid', () => {
  it('defers confirmation for unpaid pay-before-confirm holds', () => {
    expect(shouldDeferConfirmationUntilPaid('pending', [{
      payment_status: 'pending',
      metadata: { pay_before_confirm: true },
    }])).toBe(true)
    expect(shouldDeferConfirmationUntilPaid('pending', [{
      payment_status: 'processing',
      metadata: { pay_before_confirm: true },
    }])).toBe(true)
  })

  it('sends after the hold payment is captured', () => {
    expect(shouldDeferConfirmationUntilPaid('pending', [{
      payment_status: 'completed',
      metadata: { pay_before_confirm: true },
    }])).toBe(false)
    expect(shouldDeferConfirmationUntilPaid('confirmed', [{
      payment_status: 'pending',
      metadata: { pay_before_confirm: true },
    }])).toBe(false)
  })

  it('does not defer normal pending appointments', () => {
    expect(shouldDeferConfirmationUntilPaid('pending', [{
      payment_status: 'pending',
      metadata: {},
    }])).toBe(false)
  })
})

describe('safeCheckoutReturnUrl', () => {
  it('keeps same-origin return URLs and rejects open redirects', () => {
    const origin = checkoutAppUrl()
    const fallback = `${origin}/customer-dashboard?payment_failed=true`
    expect(safeCheckoutReturnUrl(`${origin}/booking/availability/demo?guest_paid=1`, fallback))
      .toBe(`${origin}/booking/availability/demo?guest_paid=1`)
    expect(safeCheckoutReturnUrl('https://evil.example/phish', fallback)).toBe(fallback)
  })
})
