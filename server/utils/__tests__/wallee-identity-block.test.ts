/**
 * Captured Wallee payments must stay pending when public-user resolution
 * is blocked. Phase 4 may still cancel ordinary abandoned checkouts.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fulfillCourseWalleePayment,
  isRetryableCourseFulfillment,
  isSuccessfulCourseFulfillment,
} from '../fulfill-course-wallee-payment'
import {
  CAPTURED_IDENTITY_BLOCK_STATE,
  partitionStalePendingWalleePayments,
} from '../wallee-identity-block'

type Row = {
  id: string
  role: string
  tenant_id: string
  email: string | null
  phone: string | null
}

const TENANT = 'tenant-course'

type Query = {
  select: () => Query
  eq: (col: string, val: unknown) => Query
  ilike: (col: string, val: unknown) => Query
  in: (col: string, val: unknown) => Query
  is: () => Query
  limit: () => Promise<{ data: Row[], error: null }>
  maybeSingle: () => Promise<{ data: Row | null, error: null }>
  insert: (payload: Record<string, unknown>) => {
    select: () => { single: () => Promise<{ data: { id: string, tenant_id: unknown }, error: null }> }
  }
  update: (payload: Record<string, unknown>) => Query
  then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>
}

function harness(initial: Row[]) {
  const rows = initial.map((row) => ({ ...row }))
  const inserts: Record<string, unknown>[] = []
  const paymentUpdates: Record<string, unknown>[] = []
  const rpcCalls: unknown[] = []
  let rpcResult: { status: string, registration_id?: string } = {
    status: 'fulfilled',
    registration_id: 'reg-1',
  }
  const supabase = {
    rpc: async (_name: string, args: unknown) => {
      rpcCalls.push(args)
      return { data: rpcResult, error: null }
    },
    from(table: string) {
      const filters: Array<{ op: 'eq' | 'ilike' | 'in', col: string, val: unknown }> = []
      const match = () => rows.filter((row) => filters.every((filter) => {
        const value = (row as Record<string, unknown>)[filter.col]
        if (filter.op === 'eq') return value === filter.val
        if (filter.op === 'ilike') return String(value ?? '').toLowerCase() === String(filter.val).toLowerCase()
        return Array.isArray(filter.val) && filter.val.includes(value)
      }))
      const q = {} as Query
      const chain = () => q
      q.select = chain
      q.eq = (col: string, val: unknown) => {
        filters.push({ op: 'eq', col, val })
        return q
      }
      q.ilike = (col: string, val: unknown) => {
        filters.push({ op: 'ilike', col, val })
        return q
      }
      q.in = (col: string, val: unknown) => {
        filters.push({ op: 'in', col, val })
        return q
      }
      q.is = chain
      q.limit = () => Promise.resolve({ data: match().slice(0, 2), error: null })
      q.maybeSingle = async () => ({ data: match()[0] ?? null, error: null })
      q.insert = (payload: Record<string, unknown>) => {
        inserts.push(payload)
        const id = `user-${rows.length + 1}`
        rows.push({
          id,
          role: String(payload.role),
          tenant_id: String(payload.tenant_id),
          email: (payload.email as string | null) ?? null,
          phone: (payload.phone as string | null) ?? null,
        })
        const inserted = {
          select: () => ({
            single: async () => ({ data: { id, tenant_id: payload.tenant_id }, error: null }),
          }),
        }
        return inserted
      }
      q.update = (payload: Record<string, unknown>) => {
        if (table === 'payments') paymentUpdates.push(payload)
        return q
      }
      q.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => (
        Promise.resolve({ data: null, error: null }).then(resolve, reject)
      )
      return q
    },
  }
  return {
    supabase,
    rows,
    inserts,
    paymentUpdates,
    rpcCalls,
    setRpc(result: { status: string, registration_id?: string }) {
      rpcResult = result
    },
  }
}

function payment(overrides?: Record<string, unknown>) {
  return {
    id: 'pay-captured',
    tenant_id: TENANT,
    user_id: null as string | null,
    payment_status: 'pending',
    metadata: {
      course_id: 'course-1',
      email: 'other@example.com',
      phone: '0791112233',
      firstname: 'Other',
      lastname: 'Person',
    },
    ...overrides,
  }
}

function expectBlocked(result: { status: string }, db: ReturnType<typeof harness>, pay: ReturnType<typeof payment>, reason: string) {
  expect(result.status).toBe('identity_blocked')
  expect(db.rpcCalls).toHaveLength(0)
  expect(db.inserts).toHaveLength(0)
  expect(pay.payment_status).toBe('pending')
  expect(pay.metadata.wallee_failure_state).toBe(CAPTURED_IDENTITY_BLOCK_STATE)
  expect(pay.metadata.identity_block_reason).toBe(reason)
  expect(pay.metadata.course_id).toBe('course-1')
  expect(db.paymentUpdates.some((update) => update.payment_status)).toBe(false)
  expect(JSON.stringify(db.paymentUpdates)).not.toMatch(/refund/i)
}

describe('captured Wallee identity block', () => {
  it('A. phone_only after capture persists the block and does not cancel', async () => {
    const db = harness([
      { id: 'owner', role: 'student', tenant_id: TENANT, email: 'owner@example.com', phone: '+41791112233' },
    ])
    const pay = payment()
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expectBlocked(result, db, pay, 'phone_only')
    expect(isRetryableCourseFulfillment(result.status)).toBe(false)
    expect(isSuccessfulCourseFulfillment(result.status)).toBe(false)
  })

  it('B. ambiguous email after capture persists the block and does not register', async () => {
    const db = harness([
      { id: 'a', role: 'client', tenant_id: TENANT, email: 'ada@example.com', phone: null },
      { id: 'b', role: 'student', tenant_id: TENANT, email: 'ada@example.com', phone: null },
    ])
    const pay = payment({
      metadata: { course_id: 'course-1', email: 'ada@example.com', firstname: 'Ada', lastname: 'Lovelace' },
    })
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expectBlocked(result, db, pay, 'ambiguous_email')
  })

  it('C/D. Phase 4 keeps identity blocks and still cancels abandoned and declined checkouts', () => {
    const rows = [
      { id: 'blocked', metadata: { wallee_failure_state: 'identity_blocked', course_id: 'course-1' } },
      { id: 'declined', metadata: { wallee_failure_state: 'FAILED' } },
      { id: 'abandoned', metadata: { course_id: 'course-9' } },
    ]
    const split = partitionStalePendingWalleePayments(rows)
    expect(split.identityBlocked.map((row) => row.id)).toEqual(['blocked'])
    expect(split.genuineFailure.map((row) => row.id)).toEqual(['declined'])
    expect(split.abandoned.map((row) => row.id)).toEqual(['abandoned'])

    const cancelIds = [...split.genuineFailure, ...split.abandoned].map((row) => row.id)
    expect(cancelIds).not.toContain('blocked')
    expect(cancelIds).toEqual(['declined', 'abandoned'])

    const cron = readFileSync(resolve(process.cwd(), 'server/api/cron/recover-pending-wallee-payments.get.ts'), 'utf8')
    expect(cron).toContain('partitionStalePendingWalleePayments')
    expect(cron).toContain('genuineFailure.map')
    expect(cron).toContain('abandonedCheckouts.map')
  })

  it('E/F. the same payment fulfills once identity is resolvable and a repeat does not duplicate', async () => {
    const db = harness([
      { id: 'owner', role: 'student', tenant_id: TENANT, email: 'owner@example.com', phone: '+41791112233' },
    ])
    const pay = payment()
    const blocked = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expectBlocked(blocked, db, pay, 'phone_only')

    const repeated = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(repeated.status).toBe('identity_blocked')
    expect(db.inserts).toHaveLength(0)
    expect(db.rpcCalls).toHaveLength(0)
    expect(db.paymentUpdates).toHaveLength(1)
    expect(pay.payment_status).toBe('pending')

    db.rows[0].phone = '+41790000000'
    const fulfilled = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(fulfilled.status).toBe('fulfilled')
    expect(fulfilled.registrationId).toBe('reg-1')
    expect(db.inserts).toHaveLength(1)
    expect(db.inserts[0]).toMatchObject({ auth_user_id: null, role: 'student', tenant_id: TENANT })
    expect(db.rpcCalls).toHaveLength(1)
    expect(pay.payment_status).toBe('completed')
    expect(pay.metadata.wallee_failure_state).toBeUndefined()
    expect(pay.metadata.identity_block_reason).toBe('phone_only')
    expect(pay.metadata.identity_block_resolved_at).toBeTruthy()

    db.setRpc({ status: 'already_fulfilled', registration_id: 'reg-1' })
    const replay = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(replay.status).toBe('already_fulfilled')
    expect(db.inserts).toHaveLength(1)
    expect(db.rpcCalls).toHaveLength(2)
    expect(pay.payment_status).toBe('completed')
  })

  it('does not refund and does not let sibling cleanup cancel a captured identity block', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/wallee-identity-block.ts'), 'utf8')
    const notify = readFileSync(resolve(process.cwd(), 'server/utils/wallee-failure-notify.ts'), 'utf8')
    expect(src).not.toContain("payment_status: 'cancelled'")
    expect(src).not.toContain("payment_status: 'completed'")
    expect(src).not.toMatch(/\.refund\(|createRefund|refundPayment/)
    expect(notify).toContain('isCapturedIdentityBlockMetadata')
  })
})
