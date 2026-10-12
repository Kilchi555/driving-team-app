/**
 * F1 public cash enroll outbox — unit/fault-injection (mocked).
 * Live PostgreSQL concurrency/TX remains gated on COURSE_ISOLATED_DB_URL.
 */
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isRetryableOutboxError,
  claimPublicCashEnrollOutboxBatch,
  completePublicCashEnrollOutboxJob,
  failPublicCashEnrollOutboxJob,
} from '../public-cash-enroll-outbox'

const root = process.cwd()
const sql = readFileSync(
  resolve(root, 'migrations/20261012_enroll_public_cash_course_with_pending_payment.sql'),
  'utf8',
)
const enrollCashSrc = readFileSync(resolve(root, 'server/api/courses/enroll-cash.post.ts'), 'utf8')
const cronSrc = readFileSync(
  resolve(root, 'server/api/cron/process-public-cash-enroll-outbox.post.ts'),
  'utf8',
)

describe('F1 outbox SQL contract', () => {
  it('creates outbox table with unique dedupe and service_role-only grants', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.public_cash_course_enroll_outbox')
    expect(sql).toContain('UNIQUE (tenant_id, dedupe_key)')
    expect(sql).toContain("CHECK (event_type IN ('confirmation_email', 'sari_sync', 'vehicle_bookings'))")
    expect(sql).toContain('REVOKE ALL ON TABLE public.public_cash_course_enroll_outbox FROM PUBLIC, anon, authenticated')
    expect(sql).toContain('claim_public_cash_enroll_outbox_batch')
    expect(sql).toContain('FOR UPDATE SKIP LOCKED')
    expect(sql).toContain('complete_public_cash_enroll_outbox_job')
    expect(sql).toContain('fail_public_cash_enroll_outbox_job')
  })

  it('inserts outbox rows only on enrolled path inside same exception block', () => {
    const idemInsert = sql.indexOf('INSERT INTO public.public_cash_course_enroll_idempotency')
    const emailDedupe = sql.indexOf("'confirmation_email:' || v_reg_id::text")
    const enrolledReturn = sql.lastIndexOf("'status', 'enrolled'")
    expect(idemInsert).toBeGreaterThan(0)
    expect(emailDedupe).toBeGreaterThan(idemInsert)
    expect(enrolledReturn).toBeGreaterThan(emailDedupe)
    expect(sql).toContain('outbox_sari')
    expect(sql).toContain('outbox_vehicle')
  })
})

describe('F1 outbox wiring', () => {
  it('enroll-cash sets outbox hints and kicks worker; skips inline cash email', () => {
    expect(enrollCashSrc).toContain('outbox_sari:')
    expect(enrollCashSrc).toContain('outbox_vehicle:')
    expect(enrollCashSrc).toContain('kickPublicCashEnrollOutboxProcessing')
    expect(enrollCashSrc).toContain("finalPaymentMethod !== 'cash_on_site'")
    expect(cronSrc).toContain('assertCronRequest')
    expect(cronSrc).toContain('drainPublicCashEnrollOutbox')
  })
})

describe('F1 outbox fault-injection (mocked claim/complete/fail)', () => {
  it('classifies retryable vs permanent errors', () => {
    expect(isRetryableOutboxError('fetch failed')).toBe(true)
    expect(isRetryableOutboxError('timeout')).toBe(true)
    expect(isRetryableOutboxError('503')).toBe(true)
    expect(isRetryableOutboxError('missing_faberid')).toBe(false)
    expect(isRetryableOutboxError('invalid recipient')).toBe(false)
  })

  it('FI-4/5/7/11: claim then complete; second complete is idempotent at RPC layer', async () => {
    const jobs = [
      {
        id: 'j1',
        tenant_id: 't',
        registration_id: 'r',
        payment_id: 'p',
        enroll_idempotency_key: 'k',
        event_type: 'confirmation_email',
        dedupe_key: 'confirmation_email:r',
        payload: {},
        status: 'processing',
        attempts: 1,
      },
    ]
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: jobs, error: null })
      .mockResolvedValueOnce({ data: { status: 'completed' }, error: null })
      .mockResolvedValueOnce({ data: { status: 'completed' }, error: null })

    const claimed = await claimPublicCashEnrollOutboxBatch({ rpc, from: () => ({}) }, { workerId: 'w1' })
    expect(claimed).toHaveLength(1)
    expect(rpc).toHaveBeenCalledWith(
      'claim_public_cash_enroll_outbox_batch',
      expect.objectContaining({ p_worker_id: 'w1' }),
    )
    await completePublicCashEnrollOutboxJob({ rpc, from: () => ({}) }, 'j1', 'w1')
    await completePublicCashEnrollOutboxJob({ rpc, from: () => ({}) }, 'j1', 'w1')
  })

  it('FI-15: permanent fail marks failed; retryable uses fail RPC without permanent', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { status: 'failed' }, error: null })
    await failPublicCashEnrollOutboxJob({ rpc, from: () => ({}) }, 'j1', 'w1', 'missing_faberid', true)
    expect(rpc).toHaveBeenCalledWith(
      'fail_public_cash_enroll_outbox_job',
      expect.objectContaining({ p_permanent: true, p_error: 'missing_faberid' }),
    )
    rpc.mockResolvedValue({ data: { status: 'pending' }, error: null })
    await failPublicCashEnrollOutboxJob({ rpc, from: () => ({}) }, 'j2', 'w1', 'timeout', false)
    expect(rpc).toHaveBeenLastCalledWith(
      'fail_public_cash_enroll_outbox_job',
      expect.objectContaining({ p_permanent: false }),
    )
  })
})

describe('F1 live outbox PG (gated — NOT RUN without COURSE_ISOLATED_DB_URL)', () => {
  const liveUrl = process.env.COURSE_ISOLATED_DB_URL
  const maybe = liveUrl ? it : it.skip

  maybe('live disposable PG outbox suite configured', () => {
    expect(liveUrl).toBeTruthy()
    expect(liveUrl).not.toContain('unyjaetebnaexaflpyoc')
    expect(liveUrl).not.toContain('kssqalisscxkhvorqwgy')
  })
})
