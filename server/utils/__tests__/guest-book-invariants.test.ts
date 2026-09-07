import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  guestSlotCategoryMismatchReason,
  invalidDrivingLessonBasePriceReason,
} from '../guest-booking-price-rule'
import { guestCheckoutHoldDecision } from '../pay-before-confirm'
import {
  onlineBookingPaymentProvider,
  paymentPolicyFromTenantSettings,
  resolveOnlineBookingPaymentMethod,
} from '../resolve-online-booking-payment-method'

const guestSrc = readFileSync(
  resolve(process.cwd(), 'server/api/booking/guest-book.post.ts'),
  'utf8'
)
const authSrc = readFileSync(
  resolve(process.cwd(), 'server/api/booking/create-appointment.post.ts'),
  'utf8'
)

describe('guest + auth booking invariants (blockers 1–3)', () => {
  it('guest checkout uses the online-booking payment policy resolver (never silent cash)', () => {
    expect(guestSrc).toContain('loadOnlineBookingPaymentPolicy')
    expect(guestSrc).toContain('resolveOnlineBookingPaymentMethod')
    expect(guestSrc).toContain('onlineBookingPaymentProvider')
    expect(guestSrc).not.toMatch(/resolvedPaymentMethod[^\n]*= 'cash'/)
    expect(authSrc).toContain('loadOnlineBookingPaymentPolicy')
    expect(authSrc).toContain('resolveOnlineBookingPaymentMethod')
    expect(authSrc).not.toMatch(/resolvedPaymentMethod[^\n]*= 'cash'/)
    expect(guestSrc).toContain('guestCheckoutHoldDecision')
    expect(guestSrc).toContain('payment_method: resolvedPaymentMethod')
    expect(guestSrc).not.toContain("resolvedPaymentMethod === 'invoice' ? 'invoice' : 'wallee'")
    expect(guestSrc).not.toContain("resolvedPaymentMethod = 'wallee'")
    expect(guestSrc).toMatch(/let holdUntilPaid = guestCheckoutHoldDecision\(/)
    expect(guestSrc).toMatch(/holdUntilPaid = guestCheckoutHoldDecision\(/)
  })

  it('guest payment state machine never remaps a resolved method after credit', () => {
    const cashPolicy = paymentPolicyFromTenantSettings({
      settings: {
        cash_payments_enabled: true,
        cash_payment_visibility: 'customers_and_staff',
        invoice_payments_enabled: true,
        default_payment_method: 'wallee',
      },
      walleeEnabled: true,
    })

    const runGuestHoldPath = (requested: 'cash' | 'wallee' | 'invoice') => {
      const paymentResolve = resolveOnlineBookingPaymentMethod({
        requested,
        policy: cashPolicy,
      })
      const requirePaymentBeforeConfirm = true
      const first = guestCheckoutHoldDecision({
        resolvedPaymentMethod: paymentResolve.method,
        requirePaymentBeforeConfirm,
        amountRappen: 18000,
      })
      const persisted = {
        payment_method: paymentResolve.method,
        payment_provider: onlineBookingPaymentProvider(paymentResolve.method),
        appointment_status: first.holdUntilPaid ? 'pending' : 'confirmed',
      }
      const afterCredit = guestCheckoutHoldDecision({
        resolvedPaymentMethod: paymentResolve.method,
        requirePaymentBeforeConfirm,
        amountRappen: 5000,
      })
      return {
        resolved: paymentResolve.method,
        persisted,
        afterCredit,
        startsWalleeCheckout: afterCredit.holdUntilPaid,
      }
    }

    const cash = runGuestHoldPath('cash')
    expect(cash.resolved).toBe('cash')
    expect(cash.persisted).toEqual({
      payment_method: 'cash',
      payment_provider: null,
      appointment_status: 'confirmed',
    })
    expect(cash.afterCredit).toEqual({ holdUntilPaid: false, paymentMethod: 'cash' })
    expect(cash.startsWalleeCheckout).toBe(false)

    const wallee = runGuestHoldPath('wallee')
    expect(wallee.resolved).toBe('wallee')
    expect(wallee.persisted.payment_method).toBe('wallee')
    expect(wallee.persisted.payment_provider).toBe('wallee')
    expect(wallee.afterCredit).toEqual({ holdUntilPaid: true, paymentMethod: 'wallee' })
    expect(wallee.startsWalleeCheckout).toBe(true)

    const invoice = runGuestHoldPath('invoice')
    expect(invoice.resolved).toBe('invoice')
    expect(invoice.persisted).toEqual({
      payment_method: 'invoice',
      payment_provider: null,
      appointment_status: 'confirmed',
    })
    expect(invoice.afterCredit).toEqual({ holdUntilPaid: false, paymentMethod: 'invoice' })
    expect(invoice.startsWalleeCheckout).toBe(false)
  })

  it('typical driving-school policy (Wallee on, cash staff-only) never defaults to cash', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: {
        cash_payments_enabled: true,
        cash_payment_visibility: 'staff_only',
        invoice_payments_enabled: false,
        default_payment_method: 'wallee',
      },
      walleeEnabled: true,
    })
    expect(resolveOnlineBookingPaymentMethod({ policy }).method).toBe('wallee')
    expect(resolveOnlineBookingPaymentMethod({ requested: 'cash', policy }).method).toBe('wallee')
    expect(onlineBookingPaymentProvider('wallee')).toBe('wallee')
    expect(onlineBookingPaymentProvider('cash')).toBeNull()
  })

  it('guest checkout aborts missing/zero base_price before creating a booking', () => {
    expect(guestSrc).toContain('invalidDrivingLessonBasePriceReason')
    expect(guestSrc).toContain('Der Preis für diese Buchung konnte nicht ermittelt werden')
    expect(guestSrc).toContain('Der Preis für diese Fahrstunde konnte nicht ermittelt werden')
    expect(guestSrc.indexOf('const basePriceProblem = invalidDrivingLessonBasePriceReason'))
      .toBeLessThan(guestSrc.indexOf('await bookOnlineAppointment'))
    expect(authSrc).toContain('invalidDrivingLessonBasePriceReason')
    expect(authSrc.indexOf('const basePriceProblem = invalidDrivingLessonBasePriceReason'))
      .toBeLessThan(authSrc.indexOf('await bookOnlineAppointment'))
  })

  it('guest checkout binds the reserved slot category before pricing and type', () => {
    expect(guestSrc).toContain('guestSlotCategoryMismatchReason')
    expect(guestSrc).toContain('CATEGORY_SLOT_MISMATCH')
    expect(guestSrc).toContain('normalizeGuestSlotServiceType')
    expect(guestSrc.indexOf('const categoryMismatch = guestSlotCategoryMismatchReason'))
      .toBeLessThan(guestSrc.indexOf('const lessonRuleType = guestBookingPriceRuleType'))
    expect(guestSrc.indexOf('const categoryMismatch = guestSlotCategoryMismatchReason'))
      .toBeLessThan(guestSrc.indexOf('type: body.category_code'))
    expect(authSrc).toContain('guestSlotCategoryMismatchReason')
    expect(authSrc.indexOf('const categoryMismatch = guestSlotCategoryMismatchReason'))
      .toBeLessThan(authSrc.indexOf('type: body.category_code'))
  })

  it('matching category is accepted; swapped category cannot undercharge a reserved slot', () => {
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: 'B Automatik',
      bodyCategoryCode: 'B Automatik',
    })).toBeNull()
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: 'B Automatik',
      bodyCategoryCode: 'B',
    })).toBe('category_slot_mismatch')
    // A cheaper/zero rule for category B must not be reachable while holding Automatik.
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'base_price',
      hasPricingRule: true,
      pricePerMinuteRappen: 0,
    })).toBe('zero_base_price_rule')
  })

  it('loads the lesson rule_type rather than any active row for the category', () => {
    expect(guestSrc).toContain(".eq('rule_type', lessonRuleType)")
    expect(guestSrc).toContain(".eq('rule_type', 'admin_fee')")
  })

  it('aborts the checkout when a benefit lock fails (does not leave a completed idempotency snapshot)', () => {
    expect(guestSrc).toContain('abortCheckoutAfterBenefitLockFail')
    expect(authSrc).toContain('abortCheckoutAfterBenefitLockFail')
    expect(guestSrc.indexOf('const locked = await lockCheckoutBenefits'))
      .toBeLessThan(guestSrc.indexOf('await abortCheckoutAfterBenefitLockFail'))
    expect(authSrc.indexOf('const locked = await lockCheckoutBenefits'))
      .toBeLessThan(authSrc.indexOf('await abortCheckoutAfterBenefitLockFail'))
  })
})
