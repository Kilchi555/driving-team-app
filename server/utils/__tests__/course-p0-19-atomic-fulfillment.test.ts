/**
 * P0-19 atomic course Wallee fulfillment.
 * Isolated live SQL is gated on COURSE_ISOLATED_DB_URL (never Production).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCourseFulfillmentPayload,
  isRetryableCourseFulfillment,
  isSuccessfulCourseFulfillment,
  paymentHasCourseId,
  shouldAtomicallyFulfillCoursePayment,
} from '../fulfill-course-wallee-payment'

const root = process.cwd()
const sql = readFileSync(resolve(root, 'migrations/20260916_fulfill_course_wallee_payment.sql'), 'utf8')

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('P0-19 atomic fulfillment SQL', () => {
  it('locks the payment, requires tenant match, inserts registration, then completes payment', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.fulfill_course_wallee_payment')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain("v_course.tenant_id IS DISTINCT FROM v_pay.tenant_id")
    expect(sql).toContain("INSERT INTO public.course_registrations")
    expect(sql).toContain("payment_status = 'completed'")
    expect(sql).toContain('capacity_exceeded')
    expect(sql).toContain('COURSE_FULL')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.fulfill_course_wallee_payment(uuid, jsonb) FROM PUBLIC')
    expect(sql).toContain("r.status IS DISTINCT FROM 'cancelled'")
    expect(sql).toContain("'payment_conflict'")
    expect(sql).toContain("'amount_mismatch'")
    expect(sql).toContain('captured_amount_chf')
    expect(sql).toContain('credit_used_rappen')
  })

  it('does not replace the existing capacity trigger', () => {
    expect(sql).not.toContain('DROP FUNCTION IF EXISTS public.enforce_course_registration_capacity')
    expect(sql).not.toContain('DROP TRIGGER')
    expect(sql).toContain('enforce_course_registration_capacity')
  })

  it('does not invent refund-required or payment_required columns', () => {
    expect(sql).not.toContain('refund-required')
    expect(sql).not.toContain('refund_required')
    expect(sql).not.toContain('payment_required')
  })
})

describe('P0-19 webhook and cron share the RPC', () => {
  it('webhook fulfills completed course payments via RPC before Layer 7', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain('fulfillCourseWalleePayment')
    expect(src).toContain('courseCompletedIds')
    expect(src).toContain("setResponseStatus(event, 503)")
    expect(src).toContain('Course fulfillment incomplete')
    expect(src).toContain('already fulfilled atomically')
    expect(src).not.toContain('payment completed without seat')
  })

  it('does not short-circuit a poisoned success log when the registration is missing', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain('webhook_logs success=true without course registration — not short-circuiting')
  })

  it('payments/process.post routes already-captured course Wallee txs through the RPC', () => {
    const src = read('server/api/payments/process.post.ts')
    expect(src).toContain('tryFulfillCourseFromCapturedWalleeTx')
    expect(src).toContain('fulfillOrThrowExistingCourseWalleeCapture')
    expect(src).toContain('completeCapturedWalleePayment')
  })
})

describe('P0-19 does not change non-Wallee payment modes', () => {
  it('cash/invoice enrollment still inserts a registration without Wallee fulfillment', () => {
    const src = read('server/api/courses/enroll-cash.post.ts')
    expect(src).toContain('.from(\'course_registrations\')')
    expect(src).toContain('resolveNonWalleeEnrollmentMethod')
    expect(src).not.toContain('fulfillCourseWalleePayment')
    expect(src).not.toContain('fulfill_course_wallee_payment')
  })

  it('Wallee enroll still rejects cash-only and usable invoice courses', () => {
    const src = read('server/api/courses/enroll-wallee.post.ts')
    expect(src).toContain('resolveEffectiveCoursePaymentMethod')
    expect(src).toContain("configured === 'CASH_ON_SITE'")
    expect(src).toContain("configured === 'INVOICE'")
    expect(src).toContain('invoiceEnabled')
    expect(src).not.toContain('fulfillCourseWalleePayment')
  })

  it('admin enrollment still supports cash, invoice, paid, reserve, online_link', () => {
    const src = read('server/utils/admin-course-enroll.ts')
    expect(src).toContain("case 'cash'")
    expect(src).toContain("case 'invoice'")
    expect(src).toContain("case 'paid'")
    expect(src).toContain("case 'reserve'")
    expect(src).toContain("case 'online_link'")
    expect(src).not.toContain('fulfillCourseWalleePayment')
  })

  it('does not invent a payment_required course column', () => {
    expect(read('server/utils/fulfill-course-wallee-payment.ts')).not.toContain('payment_required')
    expect(read('utils/courseLocationUtils.ts')).toContain("explicit === 'WALLEE' || explicit === 'CASH_ON_SITE'")
    expect(read('utils/courseLocationUtils.ts')).toContain("explicit === 'INVOICE'")
    expect(read('utils/courseLocationUtils.ts')).toContain('resolveConfiguredCoursePaymentMethod')
  })
})

describe('P0-19 helper semantics', () => {
  it('only completed course Wallee payments go through the RPC', () => {
    const coursePay = { metadata: { course_id: 'c1' } }
    const appointment = { metadata: { appointment_id: 'a1' } }
    expect(paymentHasCourseId(coursePay)).toBe(true)
    expect(paymentHasCourseId(appointment)).toBe(false)
    expect(shouldAtomicallyFulfillCoursePayment(coursePay, 'completed')).toBe(true)
    expect(shouldAtomicallyFulfillCoursePayment(coursePay, 'authorized')).toBe(false)
    expect(shouldAtomicallyFulfillCoursePayment(coursePay, 'pending')).toBe(false)
    expect(shouldAtomicallyFulfillCoursePayment(appointment, 'completed')).toBe(false)
    expect(isRetryableCourseFulfillment('capacity_exceeded')).toBe(true)
    expect(isRetryableCourseFulfillment('tenant_mismatch')).toBe(false)
    expect(isSuccessfulCourseFulfillment('already_fulfilled')).toBe(true)
    expect(isRetryableCourseFulfillment('amount_mismatch')).toBe(false)
    expect(isSuccessfulCourseFulfillment('payment_conflict')).toBe(false)
  })

  it('builds the RPC payload from trusted payment tenant + metadata course_id', () => {
    const payload = buildCourseFulfillmentPayload({
      id: 'pay-1',
      tenant_id: 'tenant-a',
      metadata: {
        course_id: 'course-1',
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.com',
        individual_session_number: 2,
      },
    }, 'user-1')
    expect(payload.course_id).toBe('course-1')
    expect(payload.tenant_id).toBe('tenant-a')
    expect(payload.user_id).toBe('user-1')
    expect(payload.individual_session_number).toBe(2)
    expect(payload.captured_amount_chf).toBeUndefined()
    const withCapture = buildCourseFulfillmentPayload({
      id: 'pay-1',
      tenant_id: 'tenant-a',
      metadata: { course_id: 'course-1' },
    }, 'user-1', 60)
    expect(withCapture.captured_amount_chf).toBe(60)
  })
})

describe('P0-19 confirmation stays outside the DB transaction', () => {
  it('webhook still sends confirmation after fulfillment via the existing email API', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain('sendCourseEnrollmentEmails(confirmationPayments)')
    expect(src).toContain('/api/emails/send-course-enrollment-confirmation')
    expect(read('server/utils/fulfill-course-wallee-payment.ts')).toContain('/api/emails/send-course-enrollment-confirmation')
  })
})
