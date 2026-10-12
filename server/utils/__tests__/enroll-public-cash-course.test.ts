/**
 * F1 public cash enrollment — contract + helper tests.
 *
 * These do NOT prove PostgreSQL transaction atomicity or concurrent locking.
 * Live SQL is gated on COURSE_ISOLATED_DB_URL (never Production or shared staging)
 * and is not run in the default suite.
 */
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  enrollPublicCashCourseWithPendingPayment,
  isSuccessfulPublicCashEnrollment,
  throwIfPublicCashEnrollmentFailed,
} from '../enroll-public-cash-course'

const root = process.cwd()
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const sql = read('migrations/20261012_enroll_public_cash_course_with_pending_payment.sql')
const enrollCashSrc = read('server/api/courses/enroll-cash.post.ts')
const adminBillingSrc = read('server/utils/course-enrollment-billing.ts')
const enrollWalleeSrc = read('server/api/courses/enroll-wallee.post.ts')

describe('F1 atomic public cash enrollment SQL (contract — not a live TX test)', () => {
  it('registration insert, payment insert, and payment_id link share one function / exception block', () => {
    const regAt = sql.indexOf('INSERT INTO public.course_registrations')
    const payAt = sql.indexOf('INSERT INTO public.payments')
    const linkAt = sql.indexOf('SET payment_id = v_payment_id')
    expect(regAt).toBeGreaterThan(0)
    expect(payAt).toBeGreaterThan(regAt)
    expect(linkAt).toBeGreaterThan(payAt)
    expect(sql).toContain('EXCEPTION')
    expect(sql).toContain('WHEN unique_violation THEN')
  })

  it('creates pending cash_on_site payment with payment_provider NULL and public_cash metadata', () => {
    expect(sql).toContain("'cash_on_site'")
    expect(sql).toContain("'pending'")
    expect(sql).toMatch(/payment_provider[\s\S]*NULL/)
    expect(sql).toContain("'public_cash_course_enroll', true")
    expect(sql).not.toMatch(/payment_provider\s*,\s*\n\s*'wallee'/)
  })

  it('adds narrowly scoped partial unique index', () => {
    expect(sql).toContain('payments_public_cash_course_enroll_registration_uidx')
    expect(sql).toContain("(metadata->>'public_cash_course_enroll') = 'true'")
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS payments_public_cash_course_enroll_registration_uidx')
  })

  it('security: SECURITY DEFINER, search_path, revoke anon/authenticated', () => {
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) FROM PUBLIC',
    )
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) FROM anon, authenticated',
    )
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) TO postgres, service_role',
    )
    expect(sql).toContain("set_config('request.jwt.claim.role', 'service_role', true)")
  })

  it('rejects tenant mismatch and verifies course belongs to tenant', () => {
    expect(sql).toContain('v_course.tenant_id IS DISTINCT FROM p_tenant_id')
    expect(sql).toContain('v_user_tenant IS DISTINCT FROM p_tenant_id')
    expect(sql).toContain("'tenant_mismatch'")
    expect(sql).toContain('FOR UPDATE')
  })

  it('idempotency: already_enrolled for matching cash seat; payment_conflict otherwise', () => {
    expect(sql).toContain("'already_enrolled'")
    expect(sql).toContain("'payment_conflict'")
    expect(sql).toContain("r.status IS DISTINCT FROM 'cancelled'")
    expect(sql).toContain("r.deleted_at IS NULL")
    expect(sql).toContain("v_exist.payment_method = 'cash_on_site'")
  })

  it('capacity trigger is not replaced', () => {
    expect(sql).toContain('course_capacity_exceeded')
    expect(sql).not.toContain('DROP TRIGGER')
    expect(sql).not.toContain('DROP FUNCTION IF EXISTS public.enforce_course_registration_capacity')
  })

  it('documents read-only duplicate preflight', () => {
    expect(sql).toContain('Read-only duplicate preflight')
    expect(sql).toContain("metadata->>'public_cash_course_enroll'")
  })
})

describe('F1 enroll-cash wiring (source contract)', () => {
  it('cash_on_site uses the atomic RPC; invoice keeps PostgREST insert', () => {
    expect(enrollCashSrc).toContain('enrollPublicCashCourseWithPendingPayment')
    expect(enrollCashSrc).toContain('throwIfPublicCashEnrollmentFailed')
    expect(enrollCashSrc).toContain("finalPaymentMethod === 'cash_on_site'")
    const cashRpcAt = enrollCashSrc.indexOf('enrollPublicCashCourseWithPendingPayment')
    const invoiceInsertAt = enrollCashSrc.lastIndexOf(".from('course_registrations')")
    expect(cashRpcAt).toBeGreaterThan(0)
    expect(invoiceInsertAt).toBeGreaterThan(cashRpcAt)
  })

  it('does not reuse createEnrollmentPayment for public cash', () => {
    expect(enrollCashSrc).not.toContain('createEnrollmentPayment')
    expect(adminBillingSrc).toContain('export async function createEnrollmentPayment')
  })

  it('confirmation email remains after enrollment creation block', () => {
    const rpcAt = enrollCashSrc.indexOf('enrollPublicCashCourseWithPendingPayment')
    const emailAt = enrollCashSrc.indexOf('send-course-enrollment-confirmation')
    expect(rpcAt).toBeGreaterThan(0)
    expect(emailAt).toBeGreaterThan(rpcAt)
  })

  it('Wallee enroll path is unchanged (still process-public / no F1 RPC)', () => {
    expect(enrollWalleeSrc).not.toContain('enroll_public_cash_course_with_pending_payment')
    expect(enrollWalleeSrc).not.toContain('enrollPublicCashCourseWithPendingPayment')
    expect(enrollWalleeSrc).toContain('/api/payments/process-public')
  })
})

describe('F1 TS helper behavior', () => {
  it('isSuccessfulPublicCashEnrollment only treats enrolled/already_enrolled as success statuses', () => {
    expect(isSuccessfulPublicCashEnrollment('enrolled')).toBe(true)
    expect(isSuccessfulPublicCashEnrollment('already_enrolled')).toBe(true)
    expect(isSuccessfulPublicCashEnrollment('rpc_error')).toBe(false)
    expect(isSuccessfulPublicCashEnrollment('payment_conflict')).toBe(false)
  })

  it('throwIfPublicCashEnrollmentFailed allows only enrolled with both ids', () => {
    expect(() =>
      throwIfPublicCashEnrollmentFailed({
        status: 'enrolled',
        registrationId: 'reg-1',
        paymentId: 'pay-1',
      }),
    ).not.toThrow()

    expect(() =>
      throwIfPublicCashEnrollmentFailed({ status: 'already_enrolled', registrationId: 'reg-1', paymentId: 'pay-1' }),
    ).toThrow()

    expect(() =>
      throwIfPublicCashEnrollmentFailed({ status: 'rpc_error' }),
    ).toThrow()

    expect(() =>
      throwIfPublicCashEnrollmentFailed({ status: 'enrolled', registrationId: 'reg-1' }),
    ).toThrow()
  })

  it('enrollPublicCashCourseWithPendingPayment maps RPC success and rejects invalid args without calling rpc', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: 'enrolled', registration_id: 'reg-1', payment_id: 'pay-1' },
      error: null,
    })
    const supabase = { rpc }
    const ok = await enrollPublicCashCourseWithPendingPayment({
      supabase,
      userId: 'u1',
      tenantId: 't1',
      courseId: 'c1',
      courseName: 'VKU',
      amountRappen: 25000,
      registration: { course_id: 'c1', tenant_id: 't1', user_id: 'u1' },
    })
    expect(ok).toEqual({
      status: 'enrolled',
      registrationId: 'reg-1',
      paymentId: 'pay-1',
    })
    expect(rpc).toHaveBeenCalledWith('enroll_public_cash_course_with_pending_payment', expect.objectContaining({
      p_user_id: 'u1',
      p_tenant_id: 't1',
      p_course_id: 'c1',
      p_amount_rappen: 25000,
      p_course_name: 'VKU',
    }))

    const bad = await enrollPublicCashCourseWithPendingPayment({
      supabase,
      userId: '',
      tenantId: 't1',
      courseId: 'c1',
      courseName: 'VKU',
      amountRappen: 100,
      registration: { course_id: 'c1', tenant_id: 't1', user_id: 'u1' },
    })
    expect(bad.status).toBe('invalid_args')
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('RPC transport error never looks like enrolled', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    }
    const result = await enrollPublicCashCourseWithPendingPayment({
      supabase,
      userId: 'u1',
      tenantId: 't1',
      courseId: 'c1',
      courseName: 'VKU',
      amountRappen: 100,
      registration: { course_id: 'c1', tenant_id: 't1', user_id: 'u1' },
    })
    expect(result.status).toBe('rpc_error')
    expect(() => throwIfPublicCashEnrollmentFailed(result)).toThrow()
  })
})

describe('F1 live SQL (gated — not run without COURSE_ISOLATED_DB_URL)', () => {
  const liveUrl = process.env.COURSE_ISOLATED_DB_URL
  const maybe = liveUrl ? it : it.skip

  maybe('live disposable PG suite is configured when COURSE_ISOLATED_DB_URL is set', () => {
    expect(liveUrl).toBeTruthy()
    expect(liveUrl).not.toContain('unyjaetebnaexaflpyoc')
    expect(liveUrl).not.toContain('kssqalisscxkhvorqwgy')
  })
})
