/**
 * C7 / C6-01 / C6-05 / C6-02.
 *
 * Behavioral helpers + in-memory supabase mocks + static contracts.
 * Does NOT prove live Wallee I/O or PostgreSQL concurrency.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  courseCapturedWalleeHttpError,
  decideProcessPostCourseCapture,
  isCourseCapturedWalleeFulfilled,
  paymentHasCourseId,
  tryFulfillCourseFromCapturedWalleeTx,
} from '../fulfill-course-wallee-payment'
import {
  isWalleeCaptureMatchingRemaining,
  walleeRemainingChf,
  walleeRemainingRappen,
} from '../wallee-remaining-amount'
import { inspectWalleeTopupPayment } from '../payment-metadata'
import { applyWalleeSyncDecision } from '../wallee-payment-sync'

const syncState = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from() {
      const chain = {
        select: () => chain,
        update: (payload: Record<string, unknown>) => {
          syncState.updates.push(payload)
          return chain
        },
        eq: () => chain,
        neq: async () => ({ error: null }),
        in: async () => ({ error: null }),
        maybeSingle: async () => ({ data: syncState.row, error: null }),
      }
      return chain
    },
  }),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const root = process.cwd()
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const coursePayment = {
  id: 'pay-course',
  tenant_id: 't1',
  user_id: 'u1',
  metadata: { course_id: 'c1' },
  total_amount_rappen: 10000,
  credit_used_rappen: 2000,
  payment_status: 'processing',
}

const appointmentPayment = {
  id: 'pay-appt',
  tenant_id: 't1',
  user_id: 'u1',
  metadata: { appointment_id: 'a1' },
  total_amount_rappen: 10000,
  credit_used_rappen: 0,
  payment_status: 'processing',
}

function fulfillSupabase(rpcData: Record<string, unknown> | null) {
  return {
    rpc: vi.fn(async () => ({ data: rpcData, error: null })),
    from() {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.maybeSingle = async () => ({ data: { id: 'u1', tenant_id: 't1' }, error: null })
      return chain
    },
  }
}

describe('C6-01 applyWalleeSyncDecision cannot generic-complete course payments (in-memory)', () => {
  beforeEach(() => {
    syncState.row = null
    syncState.updates = []
  })

  it('1. course payment through applyWalleeSyncDecision cannot generic-complete', async () => {
    syncState.row = {
      id: 'pay-course',
      payment_status: 'processing',
      metadata: { course_id: 'c1' },
    }
    const result = await applyWalleeSyncDecision({
      paymentId: 'pay-course',
      currentStatus: 'processing',
      decision: 'mark_completed',
      walleeState: 'FULFILL',
    })
    expect(result.changed).toBe(false)
    expect(result.newStatus).toBe('processing')
    expect(syncState.updates.some((u) => u.payment_status === 'completed')).toBe(false)
  })

  it('2. non-course payment retains existing generic completion', async () => {
    syncState.row = {
      id: 'pay-appt',
      payment_status: 'processing',
      metadata: { appointment_id: 'a1' },
    }
    const result = await applyWalleeSyncDecision({
      paymentId: 'pay-appt',
      currentStatus: 'processing',
      decision: 'mark_completed',
      walleeState: 'FULFILL',
    })
    expect(result.changed).toBe(true)
    expect(result.newStatus).toBe('completed')
    expect(syncState.updates.some((u) => u.payment_status === 'completed')).toBe(true)
  })

  it('client JSON cannot flip course vs non-course: DB metadata is authoritative', async () => {
    syncState.row = {
      id: 'pay-course',
      payment_status: 'processing',
      metadata: { course_id: 'c1' },
    }
    const result = await applyWalleeSyncDecision({
      paymentId: 'pay-course',
      currentStatus: 'processing',
      decision: 'mark_completed',
    })
    expect(result.changed).toBe(false)
    const spoofedTopLevelCourseId = { metadata: {}, course_id: 'spoof' }
    expect(paymentHasCourseId(spoofedTopLevelCourseId)).toBe(false)
    expect(paymentHasCourseId({ metadata: { course_id: 'c1' } })).toBe(true)
  })
})

describe('C6-01 captured Wallee → course fulfillment (behavioral, in-memory RPC)', () => {
  it('3. course + valid capture routes to course fulfillment', async () => {
    const supabase = fulfillSupabase({ status: 'fulfilled', registration_id: 'reg-1' })
    const attempt = await tryFulfillCourseFromCapturedWalleeTx({
      supabase,
      payment: coursePayment,
      walleeTx: { completedAmount: 80 },
    })
    expect(attempt.kind).toBe('fulfillment')
    expect(attempt.captureDecision).toBe('fulfill')
    expect(isCourseCapturedWalleeFulfilled(attempt)).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('fulfill_course_wallee_payment', expect.objectContaining({
      p_payment_id: 'pay-course',
    }))
    expect(courseCapturedWalleeHttpError(attempt)).toBeNull()
  })

  it('4. course + capture mismatch cannot complete', async () => {
    const supabase = fulfillSupabase({ status: 'fulfilled', registration_id: 'reg-1' })
    const attempt = await tryFulfillCourseFromCapturedWalleeTx({
      supabase,
      payment: coursePayment,
      walleeTx: { completedAmount: 100 },
    })
    expect(attempt.kind).toBe('amount_mismatch')
    expect(isCourseCapturedWalleeFulfilled(attempt)).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(courseCapturedWalleeHttpError(attempt)?.statusCode).toBe(409)
  })

  it('5. course + invalid/missing capture cannot complete', async () => {
    const supabase = fulfillSupabase({ status: 'fulfilled', registration_id: 'reg-1' })
    const missing = await tryFulfillCourseFromCapturedWalleeTx({
      supabase,
      payment: coursePayment,
      walleeTx: null,
    })
    expect(missing.kind).toBe('invalid_capture')
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(courseCapturedWalleeHttpError(missing)?.statusCode).toBe(503)

    const nan = await tryFulfillCourseFromCapturedWalleeTx({
      supabase,
      payment: coursePayment,
      walleeTx: {},
    })
    expect(nan.kind).toBe('invalid_capture')
    expect(decideProcessPostCourseCapture(coursePayment, Number.NaN)).toBe('invalid_capture')
  })

  it('6. course + already fulfilled remains idempotent', async () => {
    const supabase = fulfillSupabase({ status: 'already_fulfilled', registration_id: 'reg-1' })
    const attempt = await tryFulfillCourseFromCapturedWalleeTx({
      supabase,
      payment: { ...coursePayment, payment_status: 'completed' },
      walleeTx: { completedAmount: 80 },
    })
    expect(attempt.kind).toBe('fulfillment')
    expect(attempt.result?.status).toBe('already_fulfilled')
    expect(isCourseCapturedWalleeFulfilled(attempt)).toBe(true)
    expect(courseCapturedWalleeHttpError(attempt)).toBeNull()
  })

  it('non-course stays off the course RPC', async () => {
    const supabase = fulfillSupabase({ status: 'fulfilled', registration_id: 'reg-1' })
    const attempt = await tryFulfillCourseFromCapturedWalleeTx({
      supabase,
      payment: appointmentPayment,
      walleeTx: { completedAmount: 100 },
    })
    expect(attempt.kind).toBe('not_course')
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(courseCapturedWalleeHttpError(attempt)).toBeNull()
  })
})

describe('C6-05 process.post Layer 9 order (contract + remaining=0 semantics)', () => {
  const processSrc = read('server/api/payments/process.post.ts')

  it('7. course + remaining coverable + existing Wallee is recovered before generic Layer 9 409', () => {
    const recoverAt = processSrc.indexOf('checking capture before wallet shortcut')
    const layer9At = processSrc.indexOf('LAYER 9')
    const course409At = processSrc.indexOf('Kurszahlungen können hier nicht über Guthaben abgeschlossen werden')
    expect(recoverAt).toBeGreaterThan(layer9At)
    expect(recoverAt).toBeLessThan(course409At)
    expect(processSrc).toContain('Pure-wallet course (no wallee_transaction_id) still 409')
    expect(processSrc).toContain("COMPLETED_STATES = ['FULFILL', 'COMPLETED', 'SUCCESSFUL']")
  })

  it('8. course + remaining > 0 + matching capture routes to fulfill', () => {
    expect(decideProcessPostCourseCapture(coursePayment, 80)).toBe('fulfill')
    expect(walleeRemainingChf(coursePayment)).toBe(80)
  })

  it('9. course + remaining > 0 + mismatch rejects', () => {
    expect(decideProcessPostCourseCapture(coursePayment, 100)).toBe('amount_mismatch')
    expect(decideProcessPostCourseCapture(coursePayment, 60)).toBe('amount_mismatch')
  })

  it('remaining=0 + finite Wallee capture is amount_mismatch, not generic complete', () => {
    const fullCredit = {
      ...coursePayment,
      credit_used_rappen: 10000,
    }
    expect(walleeRemainingRappen(fullCredit)).toBe(0)
    expect(decideProcessPostCourseCapture(fullCredit, 80)).toBe('amount_mismatch')
    expect(decideProcessPostCourseCapture(fullCredit, 0)).toBe('amount_mismatch')
    expect(courseCapturedWalleeHttpError({
      kind: 'amount_mismatch',
      captureDecision: 'amount_mismatch',
      capturedChf: 80,
    })?.statusCode).toBe(409)
  })
})

describe('C6-02 create-transaction course completion (contract)', () => {
  const createSrc = read('server/api/wallee/create-transaction.post.ts')

  it('10. untyped payment UUID lookup can receive a course payment; FULFILL cannot generic-complete it', () => {
    expect(createSrc).toContain(".eq('id', orderId)")
    expect(createSrc).toContain('paymentHasCourseId(paymentForCourse)')
    expect(createSrc).toContain('tryFulfillCourseFromCapturedWalleeTx')
    expect(createSrc).toContain('normalizePaymentMetadata')
    const courseGuard = createSrc.indexOf('paymentHasCourseId(paymentForCourse)')
    const genericComplete = createSrc.indexOf("payment_status: 'completed'")
    expect(courseGuard).toBeGreaterThan(0)
    expect(courseGuard).toBeLessThan(genericComplete)
    expect(createSrc).toContain("select('id, tenant_id, user_id, appointment_id")
    expect(createSrc).toContain('metadata')
  })

  it('course detection uses DB metadata, not client JSON', () => {
    expect(createSrc).not.toMatch(/course_id.*parseResult|parseResult.*course_id/)
    expect(createSrc).toContain('normalizePaymentMetadata((paymentRow as any).metadata)')
  })
})

describe('C6-01 status-sync path contract', () => {
  it('syncAndResolvePayment intercepts mark_completed for course before generic apply', () => {
    const src = read('server/utils/wallee-payment-sync.ts')
    const markAt = src.indexOf("if (sync.decision === 'mark_completed')")
    const fulfillAt = src.indexOf('tryFulfillCourseFromCapturedWalleeTx', markAt)
    const applyAt = src.indexOf('applyWalleeSyncDecision({', fulfillAt)
    expect(markAt).toBeGreaterThan(0)
    expect(fulfillAt).toBeGreaterThan(markAt)
    expect(applyAt).toBeGreaterThan(fulfillAt)
    expect(src).toContain('rawTx')
    expect(src).toContain('loadPaymentForCourseAwareSync')
    expect(src).toContain('refused generic completed for course payment')
  })

  it('status.post and release-processing-lock still go through syncAndResolvePayment', () => {
    const statusSrc = read('server/api/payments/status.post.ts')
    const releaseSrc = read('server/api/payments/release-processing-lock.post.ts')
    expect(statusSrc).toContain('syncAndResolvePayment')
    expect(releaseSrc).toContain('syncAndResolvePayment')
    expect(statusSrc).not.toContain("payment_status: 'completed'")
  })
})

describe('C7 regression', () => {
  it('12. #219 top-up is blocked by metadata.course_id and completeCapturedWalleePayment is unchanged', () => {
    expect(inspectWalleeTopupPayment({
      payment_method: 'wallee',
      description: 'Guthaben aufladen',
      total_amount_rappen: 10000,
      lesson_price_rappen: 10000,
      metadata: { course_id: 'course-1', is_topup: true, topup_amount_rappen: 10000 },
    }).isTopup).toBe(false)
    const topup = read('server/utils/topup-credit.ts')
    expect(topup).toContain('apply_wallee_topup_deposit')
    expect(topup).toContain('export async function completeCapturedWalleePayment')
    expect(read('server/api/payments/process.post.ts')).toContain('completeCapturedWalleePayment')
  })

  it('13. #224 remaining 100/0=100, 100/20=80, 100/100=0; capture 80 vs 80; 100 vs 80 reject; ±0.01 inclusive', () => {
    expect(walleeRemainingChf({ total_amount_rappen: 10000, credit_used_rappen: 0 })).toBe(100)
    expect(walleeRemainingChf({ total_amount_rappen: 10000, credit_used_rappen: 2000 })).toBe(80)
    expect(walleeRemainingChf({ total_amount_rappen: 10000, credit_used_rappen: 10000 })).toBe(0)
    const remaining80 = { total_amount_rappen: 10000, credit_used_rappen: 2000 }
    expect(isWalleeCaptureMatchingRemaining(80, remaining80)).toBe(true)
    expect(isWalleeCaptureMatchingRemaining(100, remaining80)).toBe(false)
    const src = read('server/utils/wallee-remaining-amount.ts')
    expect(src).toContain('Math.abs(capturedChf - expectedChf) <= 0.01')
    expect(isWalleeCaptureMatchingRemaining(79.99, remaining80)).toBe(Math.abs(79.99 - 80) <= 0.01)
  })

  it('14. #209 no public course_sessions grant in the revoke migration', () => {
    const sql = read('migrations/20260913_p1_course_sessions_revoke_anon_select.sql')
    const executable = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
    expect(executable).toMatch(/REVOKE\s+SELECT\s+ON\s+TABLE\s+public\.course_sessions\s+FROM\s+anon/i)
    expect(executable).not.toMatch(/GRANT\s+SELECT\s+ON\s+TABLE\s+public\.course_sessions\s+TO\s+anon/i)
  })
})
