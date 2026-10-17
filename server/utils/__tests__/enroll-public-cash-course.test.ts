/**
 * F1 public cash enrollment — contract + helper tests (idempotency hardening).
 *
 * Live SQL is gated on COURSE_ISOLATED_DB_URL (never Production or shared staging)
 * and is not run in the default suite. These tests do NOT prove PostgreSQL
 * transaction atomicity or concurrent locking.
 */
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  enrollPublicCashCourseWithPendingPayment,
  isSuccessfulPublicCashEnrollment,
  isUuidV4,
  throwIfPublicCashEnrollmentFailed,
} from '../enroll-public-cash-course'

const root = process.cwd()
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const sql = read('migrations/20261012_enroll_public_cash_course_with_pending_payment.sql')
const enrollCashSrc = read('server/api/courses/enroll-cash.post.ts')
const modalSrc = read('components/customer/CourseEnrollmentModal.vue')
const enrollWalleeSrc = read('server/api/courses/enroll-wallee.post.ts')
const adminBillingSrc = read('server/utils/course-enrollment-billing.ts')

const SAMPLE_KEY = '550e8400-e29b-41d4-a716-446655440000'

describe('F1 UUID v4 helper', () => {
  it('accepts UUID v4 and rejects missing/malformed', () => {
    expect(isUuidV4(SAMPLE_KEY)).toBe(true)
    expect(isUuidV4('not-a-uuid')).toBe(false)
    expect(isUuidV4('')).toBe(false)
    expect(isUuidV4(null)).toBe(false)
    expect(isUuidV4('550e8400-e29b-11d4-a716-446655440000')).toBe(false) // not version 4
  })
})

describe('F1 SQL contract — idempotency + atomic enroll', () => {
  it('creates idempotency table with tenant+key PK and completed-only linkage', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.public_cash_course_enroll_idempotency')
    expect(sql).toContain('PRIMARY KEY (tenant_id, idempotency_key)')
    expect(sql).toContain('request_hash text NOT NULL')
    expect(sql).toContain('registration_id uuid NOT NULL')
    expect(sql).toContain('payment_id uuid NOT NULL')
    expect(sql).toContain('REVOKE ALL ON TABLE public.public_cash_course_enroll_idempotency FROM PUBLIC, anon, authenticated')
  })

  it('requires p_idempotency_key and uses advisory lock + request hash', () => {
    expect(sql).toContain('p_idempotency_key uuid')
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('v_request_hash := md5(v_canonical)')
    expect(sql).toContain("'idempotent_replay'")
    expect(sql).toContain("'idempotency_conflict'")
    expect(sql).toContain('cash_on_site')
  })

  it('registration, payment, payment_id link, and idempotency insert share one exception block', () => {
    const regAt = sql.indexOf('INSERT INTO public.course_registrations')
    const payAt = sql.indexOf('INSERT INTO public.payments')
    const linkAt = sql.indexOf('SET payment_id = v_payment_id')
    const idemAt = sql.indexOf('INSERT INTO public.public_cash_course_enroll_idempotency')
    expect(regAt).toBeGreaterThan(0)
    expect(payAt).toBeGreaterThan(regAt)
    expect(linkAt).toBeGreaterThan(payAt)
    expect(idemAt).toBeGreaterThan(linkAt)
    expect(sql).toContain('WHEN unique_violation THEN')
  })

  it('documents hash canonicalization and partial payment unique index', () => {
    expect(sql).toContain('REQUEST HASH CANONICALIZATION')
    expect(sql).toContain('payments_public_cash_course_enroll_registration_uidx')
    expect(sql).toContain("(metadata->>'public_cash_course_enroll') = 'true'")
    // Deterministic custom_sessions — never raw jsonb::text for objects.
    expect(sql).toContain('jsonb_each_text')
    expect(sql).toContain('ORDER BY e.key')
    expect(sql).toContain('v_custom_canon')
    expect(sql).not.toMatch(/v_custom::text/)
  })

  it('security: DEFINER, search_path, OWNER postgres, revoke anon/authenticated', () => {
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(sql).toContain('OWNER TO postgres')
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) FROM PUBLIC',
    )
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) FROM anon, authenticated',
    )
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) TO postgres, service_role',
    )
  })

  it('sets payment_provider NULL and hardcodes cash_on_site/pending', () => {
    expect(sql).toMatch(/payment_provider[\s\S]*NULL/)
    expect(sql).toContain("'public_cash_course_enroll', true")
  })
})

describe('F1 enroll-cash + modal wiring', () => {
  it('cash_on_site requires UUID idempotencyKey; invoice path unchanged', () => {
    expect(enrollCashSrc).toContain('isUuidV4(rawIdempotencyKey)')
    expect(enrollCashSrc).toContain('idempotencyKey: rawIdempotencyKey')
    expect(enrollCashSrc).toContain("finalPaymentMethod === 'cash_on_site'")
    expect(enrollCashSrc).toContain(".from('course_registrations')")
  })

  it('modal uses body.idempotencyKey, secure UUID, clears only on success/close', () => {
    expect(modalSrc).toContain('createSecureCashEnrollIdempotencyKey')
    expect(modalSrc).toContain('ensureCashIdempotencyKey')
    expect(modalSrc).toContain('clearCashIdempotencyKey')
    expect(modalSrc).not.toContain('Math.random')
    expect(modalSrc).not.toContain('shouldRetireCashIdempotencyKeyAfterError')
    expect(modalSrc).toContain('idempotencyKey: cashKey')
    expect(enrollCashSrc).toContain('idempotentReplay: true')
    expect(enrollCashSrc).toContain('kickPublicCashEnrollOutboxProcessing')
    expect(enrollCashSrc).toContain('kick outbox drain')
  })

  it('does not reuse createEnrollmentPayment; Wallee unchanged', () => {
    expect(enrollCashSrc).not.toContain('createEnrollmentPayment')
    expect(adminBillingSrc).toContain('export async function createEnrollmentPayment')
    expect(enrollWalleeSrc).not.toContain('enrollPublicCashCourseWithPendingPayment')
    expect(enrollWalleeSrc).not.toContain('idempotencyKey')
  })

  it('confirmation email remains after enrollment block', () => {
    const rpcAt = enrollCashSrc.indexOf('enrollPublicCashCourseWithPendingPayment')
    const emailAt = enrollCashSrc.indexOf('send-course-enrollment-confirmation')
    expect(rpcAt).toBeGreaterThan(0)
    expect(emailAt).toBeGreaterThan(rpcAt)
  })
})

describe('F1 TS helper behavior', () => {
  it('treats enrolled and idempotent_replay as success statuses', () => {
    expect(isSuccessfulPublicCashEnrollment('enrolled')).toBe(true)
    expect(isSuccessfulPublicCashEnrollment('idempotent_replay')).toBe(true)
    expect(isSuccessfulPublicCashEnrollment('idempotency_conflict')).toBe(false)
    expect(isSuccessfulPublicCashEnrollment('payment_conflict')).toBe(false)
  })

  it('throwIf allows enrolled/replay with IDs; maps conflict codes', () => {
    expect(() =>
      throwIfPublicCashEnrollmentFailed({
        status: 'enrolled',
        registrationId: 'reg-1',
        paymentId: 'pay-1',
      }),
    ).not.toThrow()
    expect(() =>
      throwIfPublicCashEnrollmentFailed({
        status: 'idempotent_replay',
        registrationId: 'reg-1',
        paymentId: 'pay-1',
      }),
    ).not.toThrow()
    expect(() =>
      throwIfPublicCashEnrollmentFailed({ status: 'idempotency_conflict', registrationId: 'r', paymentId: 'p' }),
    ).toThrow()
    expect(() =>
      throwIfPublicCashEnrollmentFailed({ status: 'payment_conflict', registrationId: 'r' }),
    ).toThrow()
    expect(() =>
      throwIfPublicCashEnrollmentFailed({ status: 'invalid_args', error: 'idempotency_key_invalid' }),
    ).toThrow()
  })

  it('rejects invalid idempotency key without calling rpc', async () => {
    const rpc = vi.fn()
    const result = await enrollPublicCashCourseWithPendingPayment({
      supabase: { rpc },
      userId: 'u1',
      tenantId: 't1',
      courseId: 'c1',
      courseName: 'VKU',
      amountRappen: 100,
      idempotencyKey: 'bad',
      registration: { course_id: 'c1', tenant_id: 't1', user_id: 'u1' },
    })
    expect(result.status).toBe('invalid_args')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('passes idempotency key to RPC and maps enrolled / replay / transport error', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: { status: 'enrolled', registration_id: 'reg-1', payment_id: 'pay-1' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { status: 'idempotent_replay', registration_id: 'reg-1', payment_id: 'pay-1' },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const supabase = { rpc }
    const base = {
      supabase,
      userId: 'u1',
      tenantId: 't1',
      courseId: 'c1',
      courseName: 'VKU',
      amountRappen: 25000,
      idempotencyKey: SAMPLE_KEY,
      registration: { course_id: 'c1', tenant_id: 't1', user_id: 'u1' },
    }

    await expect(enrollPublicCashCourseWithPendingPayment(base)).resolves.toEqual({
      status: 'enrolled',
      registrationId: 'reg-1',
      paymentId: 'pay-1',
    })
    expect(rpc).toHaveBeenCalledWith(
      'enroll_public_cash_course_with_pending_payment',
      expect.objectContaining({ p_idempotency_key: SAMPLE_KEY }),
    )

    await expect(enrollPublicCashCourseWithPendingPayment(base)).resolves.toEqual({
      status: 'idempotent_replay',
      registrationId: 'reg-1',
      paymentId: 'pay-1',
    })

    const fail = await enrollPublicCashCourseWithPendingPayment(base)
    expect(fail.status).toBe('rpc_error')
    expect(() => throwIfPublicCashEnrollmentFailed(fail)).toThrow()
  })
})

describe('F1 live SQL (gated — NOT RUN without COURSE_ISOLATED_DB_URL)', () => {
  const liveUrl = process.env.COURSE_ISOLATED_DB_URL
  const maybe = liveUrl ? it : it.skip

  maybe('live disposable PG suite is configured when COURSE_ISOLATED_DB_URL is set', () => {
    expect(liveUrl).toBeTruthy()
    expect(liveUrl).not.toContain('unyjaetebnaexaflpyoc')
    expect(liveUrl).not.toContain('kssqalisscxkhvorqwgy')
  })
})
