/**
 * C3 regressions. Mix of behavioral helpers, in-memory simulation, and
 * static contracts. Simulated locking is NOT PostgreSQL FOR UPDATE.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  capturedAmountChfFromWalleeTx,
  isWalleeCaptureMatchingRemaining,
  shouldRejectWalleeCaptureMismatch,
} from '../wallee-remaining-amount'
import { registrationConsumesSeat } from '../course-capacity'
import { buildCourseFulfillmentPayload, shouldAtomicallyFulfillCoursePayment } from '../fulfill-course-wallee-payment'
import {
  restoreTransferredSource,
  snapshotTransferSource,
  transferSourceMatchesSnapshot,
  transferSourceRestorePatch,
  TRANSFER_SOURCE_RESTORE_FATAL,
} from '../sari-transfer-source'

const root = process.cwd()
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const payment = {
  total_amount_rappen: 10000,
  credit_used_rappen: 4000,
}

describe('C2-01 remaining-amount gate (behavioral)', () => {
  it('same capture that webhook rejects is also rejected for cron', () => {
    const capturedChf = capturedAmountChfFromWalleeTx({ completedAmount: 100 })
    expect(capturedChf).toBe(100)
    expect(isWalleeCaptureMatchingRemaining(100, payment)).toBe(false)
    expect(shouldRejectWalleeCaptureMismatch(100, payment)).toBe(true)
    expect(shouldRejectWalleeCaptureMismatch(60, payment)).toBe(false)
  })

  it('non-finite capture does not reject (same as #224 webhook)', () => {
    expect(shouldRejectWalleeCaptureMismatch(NaN, payment)).toBe(false)
    expect(shouldRejectWalleeCaptureMismatch(Number('nope'), payment)).toBe(false)
  })

  it('webhook and cron both call the shared helper before fulfillment', () => {
    const webhook = read('server/api/wallee/webhook.post.ts')
    const cron = read('server/api/cron/recover-pending-wallee-payments.get.ts')
    expect(webhook).toContain('shouldRejectWalleeCaptureMismatch')
    expect(webhook).toContain('capturedAmountChfFromWalleeTx')
    expect(cron).toContain('shouldRejectWalleeCaptureMismatch')
    expect(cron).toContain('capturedAmountChfFromWalleeTx')
    expect(cron.indexOf('shouldRejectWalleeCaptureMismatch')).toBeLessThan(
      cron.indexOf('fulfillCourseWalleePayment'),
    )
  })
})

describe('C2-02 SARI source restore (behavioral + simulation)', () => {
  const source = snapshotTransferSource({
    id: 'reg-1',
    payment_id: 'pay-1',
    status: 'confirmed',
    deleted_at: null,
    notes: 'original notes',
  })

  it('A) restore patch puts every mutated source field back', () => {
    const patch = transferSourceRestorePatch(source, '2026-09-16T00:00:00Z')
    expect(patch).toEqual({
      payment_id: 'pay-1',
      status: 'confirmed',
      deleted_at: null,
      notes: 'original notes',
      updated_at: '2026-09-16T00:00:00Z',
    })
  })

  it('B/C) target insert failure restores source even without payment_id', async () => {
    const unpaid = snapshotTransferSource({
      id: 'reg-2',
      payment_id: null,
      status: 'pending',
      deleted_at: null,
      notes: null,
    })
    const rows = new Map([[unpaid.id, {
      payment_id: null,
      status: 'cancelled',
      deleted_at: 'now',
      notes: 'Umgebucht',
    }]])
    const fake = {
      from() {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              Object.assign(rows.get(unpaid.id)!, patch)
              return { error: null }
            },
          }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: rows.get(unpaid.id) }),
            }),
          }),
        }
      },
    }
    const result = await restoreTransferredSource({
      supabase: fake,
      snapshot: unpaid,
      updatedAt: 't',
    })
    expect(result).toEqual({ ok: true })
    expect(transferSourceMatchesSnapshot(rows.get(unpaid.id), unpaid)).toBe(true)
  })

  it('D) restore verify failure is fatal, not silent success', async () => {
    const fake = {
      from() {
        return {
          update: () => ({ eq: async () => ({ error: null }) }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { payment_id: null, status: 'cancelled', deleted_at: 'x', notes: 'lost' },
              }),
            }),
          }),
        }
      },
    }
    const result = await restoreTransferredSource({
      supabase: fake,
      snapshot: source,
      updatedAt: 't',
    })
    expect(result).toEqual({ ok: false, reason: 'verify_failed' })
    expect(TRANSFER_SOURCE_RESTORE_FATAL).toMatch(/nicht wiederhergestellt/)
  })
})

describe('C2-03 credit path uses a single DB transaction RPC', () => {
  it('enroll-wallee no longer inserts a paid seat then compensates wallet', () => {
    const src = read('server/api/courses/enroll-wallee.post.ts')
    expect(src).toContain('enrollCourseWithCredit')
    expect(src).toContain('throwIfCreditEnrollmentFailed')
    expect(src).not.toContain('rollbackCreditSeat')
    expect(src).not.toContain('await deductStudentCredit')
    expect(src).not.toContain('incrementStudentCredit')
    expect(src.split(".from('course_registrations').insert").length - 1).toBe(0)
  })

  it('credit RPC is only reached with sessionPrincipalId, never a contact-matched guestUserId', () => {
    const src = read('server/api/courses/enroll-wallee.post.ts')
    const creditCall = src.slice(src.indexOf('const creditResult = await enrollCourseWithCredit'))
    expect(creditCall).toContain('userId: sessionPrincipalId')
    expect(creditCall).not.toContain('guestUserId')
    expect(src).not.toContain('guestUserId = existingUser.id')
  })
})

describe('C2-05 already_fulfilled seat predicate (behavioral + contract)', () => {
  it('cancelled and deleted rows do not consume a seat', () => {
    expect(registrationConsumesSeat({ status: 'confirmed', deleted_at: null })).toBe(true)
    expect(registrationConsumesSeat({ status: 'cancelled', deleted_at: null })).toBe(false)
    expect(registrationConsumesSeat({ status: 'confirmed', deleted_at: '2026-01-01' })).toBe(false)
  })

  it('SQL already_fulfilled requires the canonical seat predicate', () => {
    const sql = read('migrations/20260916_fulfill_course_wallee_payment.sql')
    const already = sql.slice(
      sql.indexOf('-- C2-05: already_fulfilled'),
      sql.indexOf('already_fulfilled', sql.indexOf('-- C2-05: already_fulfilled') + 40),
    )
    expect(sql).toContain('AND r.status IS DISTINCT FROM \'cancelled\'')
    expect(already.length).toBeGreaterThan(0)
  })
})

describe('C2-06 unique-violation payment identity (contract)', () => {
  it('never overwrites a different payment_id', () => {
    const sql = read('migrations/20260916_fulfill_course_wallee_payment.sql')
    expect(sql).toContain("status', 'payment_conflict'")
    expect(sql).toContain('v_exist.payment_id IS DISTINCT FROM v_pay.id')
    expect(sql).toContain('AND (payment_id IS NULL OR payment_id = v_pay.id)')
  })
})

describe('C2-07 / C2-10 RPC financial and tenant boundary (contract)', () => {
  it('documents caller-guaranteed capture and re-checks captured_amount_chf', () => {
    const sql = read('migrations/20260916_fulfill_course_wallee_payment.sql')
    expect(sql).toContain('FINANCIAL GATE (C2-07)')
    expect(sql).toContain('Primary guarantee is the CALLER')
    expect(sql).toContain('captured_amount_chf')
    expect(sql).toContain('credit_used_rappen')
    expect(sql).toContain("payment_status IN ('refunded', 'cancelled')")
    expect(sql).toContain('FROM public.users u')
    expect(sql).toContain('v_user_id := v_pay.user_id')
  })

  it('payload prefers payment tenant and only adds finite capture', () => {
    const payload = buildCourseFulfillmentPayload({
      id: 'p',
      tenant_id: 't-a',
      user_id: 'u-a',
      metadata: { course_id: 'c-a' },
    }, 'u-b', 12.5)
    expect(payload.tenant_id).toBe('t-a')
    expect(payload.captured_amount_chf).toBe(12.5)
  })
})

describe('C2-09 email only on fulfilled transition (contract)', () => {
  it('webhook emails only newly fulfilled course payments', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain('newlyFulfilledCourseIds')
    expect(src).toContain('newlyFulfilledCourseIds.has(p.id)')
  })

  it('cron emails only when RPC status is fulfilled', () => {
    const src = read('server/api/cron/recover-pending-wallee-payments.get.ts')
    expect(src).toContain("result.status === 'fulfilled' && result.registrationId")
    expect(src).toContain('sendCourseFulfillmentConfirmation')
    const sendAt = src.indexOf('sendCourseFulfillmentConfirmation')
    const alreadyBlock = src.indexOf('if (result.registrationId)')
    expect(alreadyBlock).toBe(-1)
    expect(sendAt).toBeGreaterThan(0)
  })
})

describe('authorized vs completed', () => {
  it('authorized course payments do not enter the atomic RPC', () => {
    expect(shouldAtomicallyFulfillCoursePayment({ metadata: { course_id: 'c' } }, 'authorized')).toBe(false)
    expect(shouldAtomicallyFulfillCoursePayment({ metadata: { course_id: 'c' } }, 'completed')).toBe(true)
  })
})
