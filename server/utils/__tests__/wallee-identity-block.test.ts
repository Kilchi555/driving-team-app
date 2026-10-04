/**
 * Captured Wallee payments must stay pending when public-user resolution
 * is blocked. Phase 4 may still cancel ordinary abandoned checkouts.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  fulfillCourseWalleePayment,
  isRetryableCourseFulfillment,
  isSuccessfulCourseFulfillment,
} from '../fulfill-course-wallee-payment'
import {
  CAPTURED_IDENTITY_BLOCK_STATE,
  IDENTITY_BLOCK_STATE_COLUMN,
  cancelStalePendingWalleePaymentIds,
  partitionStalePendingWalleePayments,
} from '../wallee-identity-block'
import { cancelOrphanedSiblingCoursePayments } from '../wallee-failure-notify'

const adminHolder = vi.hoisted(() => ({
  client: null as PaymentAdmin | null,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => {
    if (!adminHolder.client) throw new Error('supabase admin mock is not installed')
    return adminHolder.client
  },
}))

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
  const userUpdates: Record<string, unknown>[] = []
  const queries: Array<{ table: string, filters: Array<{ op: string, col: string, val: unknown }> }> = []
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
      const record = () => {
        queries.push({ table, filters: filters.map((filter) => ({ ...filter })) })
      }
      q.limit = () => {
        record()
        return Promise.resolve({ data: match().slice(0, 2), error: null })
      }
      q.maybeSingle = async () => {
        record()
        return { data: match()[0] ?? null, error: null }
      }
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
        if (table === 'users') userUpdates.push(payload)
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
    userUpdates,
    queries,
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
    expect(db.inserts[0]).toMatchObject({ auth_user_id: null, role: 'client', tenant_id: TENANT })
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
    const persistAndClear = src.slice(src.indexOf('export async function persistCapturedIdentityBlock'))
    const notify = readFileSync(resolve(process.cwd(), 'server/utils/wallee-failure-notify.ts'), 'utf8')
    expect(persistAndClear).not.toContain("payment_status: 'cancelled'")
    expect(persistAndClear).not.toContain("payment_status: 'completed'")
    expect(src).not.toMatch(/\.refund\(|createRefund|refundPayment/)
    expect(notify).toContain('isCapturedIdentityBlockMetadata')
    expect(notify).toContain('excludeCapturedIdentityBlock(')
    const cron = readFileSync(resolve(process.cwd(), 'server/api/cron/recover-pending-wallee-payments.get.ts'), 'utf8')
    expect(cron).toContain('cancelStalePendingWalleePaymentIds(')
    expect(cron).not.toContain(".in('id', genuineFailureIds)")
    expect(cron).not.toContain(".in('id', trueAbandonedIds)")
  })
})

type PayRow = {
  id: string
  tenant_id: string
  user_id: string | null
  payment_status: string
  metadata: Record<string, unknown> | null
  course_registration_id: string | null
  appointment_id: string | null
}

type QueryResult = {
  data: PayRow[] | null
  error: null
  count: number | null
}

type PaymentQuery = PromiseLike<QueryResult> & {
  select: (columns?: string) => PaymentQuery
  eq: (column: string, value: unknown) => PaymentQuery
  in: (column: string, values: readonly unknown[]) => PaymentQuery
  neq: (column: string, value: unknown) => PaymentQuery
  contains: (column: string, value: Record<string, unknown>) => PaymentQuery
  isDistinct: (column: string, value: string) => PaymentQuery
  limit: (count: number) => PaymentQuery
}

type PaymentAdmin = {
  from: (table: string) => {
    select: (columns?: string) => PaymentQuery
    update: (payload: Record<string, unknown>) => PaymentQuery
  }
}

function readPaymentColumn(row: PayRow, column: string): unknown {
  if (column === IDENTITY_BLOCK_STATE_COLUMN) {
    const state = row.metadata?.wallee_failure_state
    return typeof state === 'string' ? state : null
  }
  switch (column) {
    case 'id':
      return row.id
    case 'tenant_id':
      return row.tenant_id
    case 'user_id':
      return row.user_id
    case 'payment_status':
      return row.payment_status
    case 'metadata':
      return row.metadata
    case 'course_registration_id':
      return row.course_registration_id
    case 'appointment_id':
      return row.appointment_id
    default:
      throw new Error(`unexpected column ${column}`)
  }
}

function sqlNeq(current: unknown, value: unknown): boolean {
  if (current === null || current === undefined || value === null || value === undefined) return false
  return current !== value
}

function sqlIsDistinctFrom(current: unknown, value: unknown): boolean {
  const currentMissing = current === null || current === undefined
  const valueMissing = value === null || value === undefined
  if (currentMissing || valueMissing) return currentMissing !== valueMissing
  return current !== value
}

function clonePayRow(row: PayRow): PayRow {
  return {
    ...row,
    metadata: row.metadata ? { ...row.metadata } : null,
  }
}

function paymentAdmin(rows: PayRow[]) {
  const hooks: { beforeUpdate: (() => void) | null } = { beforeUpdate: null }

  function query(mode: 'select' | 'update', payload?: Record<string, unknown>): PaymentQuery {
    const filters: Array<(row: PayRow) => boolean> = []
    let limitCount = Number.POSITIVE_INFINITY
    const api = {
      select: () => api,
      eq: (column: string, value: unknown) => {
        filters.push((row) => readPaymentColumn(row, column) === value)
        return api
      },
      in: (column: string, values: readonly unknown[]) => {
        filters.push((row) => values.includes(readPaymentColumn(row, column)))
        return api
      },
      neq: (column: string, value: unknown) => {
        filters.push((row) => sqlNeq(readPaymentColumn(row, column), value))
        return api
      },
      contains: (_column: string, value: Record<string, unknown>) => {
        filters.push((row) => {
          const metadata = row.metadata
          if (!metadata) return false
          return Object.entries(value).every(([key, expected]) => metadata[key] === expected)
        })
        return api
      },
      isDistinct: (column: string, value: string) => {
        filters.push((row) => sqlIsDistinctFrom(readPaymentColumn(row, column), value))
        return api
      },
      limit: (count: number) => {
        limitCount = count
        return api
      },
      then: (
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => {
        if (mode === 'update' && hooks.beforeUpdate) {
          const hook = hooks.beforeUpdate
          hooks.beforeUpdate = null
          hook()
        }
        const matched = rows.filter((row) => filters.every((filter) => filter(row))).slice(0, limitCount)
        if (mode === 'update' && payload) {
          for (const row of matched) {
            if (typeof payload.payment_status === 'string') row.payment_status = payload.payment_status
            if (payload.metadata && typeof payload.metadata === 'object') {
              row.metadata = { ...(payload.metadata as Record<string, unknown>) }
            }
          }
          return Promise.resolve({ data: null, error: null, count: matched.length }).then(onFulfilled, onRejected)
        }
        return Promise.resolve({
          data: matched.map(clonePayRow),
          error: null,
          count: null,
        }).then(onFulfilled, onRejected)
      },
    }
    return api
  }

  const client: PaymentAdmin = {
    from: (table: string) => {
      if (table !== 'payments') throw new Error(`unexpected table ${table}`)
      return {
        select: () => query('select'),
        update: (payload: Record<string, unknown>) => query('update', payload),
      }
    },
  }
  return { client, rows, hooks }
}

function payRow(overrides: Partial<PayRow> & Pick<PayRow, 'id'>): PayRow {
  return {
    tenant_id: TENANT,
    user_id: null,
    payment_status: 'pending',
    metadata: {},
    course_registration_id: null,
    appointment_id: null,
    ...overrides,
  }
}

describe('identity-block cancel race', () => {
  it('A. recovery update leaves a payment blocked after the select pending', async () => {
    const blocked = payRow({
      id: 'pay-race',
      metadata: { course_id: 'course-1' },
    })
    const db = paymentAdmin([blocked])
    const selected = await db.client.from('payments').select('id, metadata').eq('payment_status', 'pending')
    const split = partitionStalePendingWalleePayments(selected.data ?? [])
    expect(split.abandoned.map((row) => row.id)).toEqual(['pay-race'])

    blocked.metadata = {
      ...(blocked.metadata ?? {}),
      wallee_failure_state: CAPTURED_IDENTITY_BLOCK_STATE,
    }
    const result = await cancelStalePendingWalleePaymentIds(db.client, ['pay-race'], 'Checkout-Abbruch')
    expect(result.error).toBeNull()
    expect(result.count).toBe(0)
    expect(blocked.payment_status).toBe('pending')
    expect(blocked.metadata?.wallee_failure_state).toBe(CAPTURED_IDENTITY_BLOCK_STATE)
  })

  it('B. sibling cleanup does not cancel a payment blocked after the select', async () => {
    const orphan = payRow({
      id: 'orphan',
      metadata: { course_id: 'course-1', email: 'ada@example.com' },
    })
    const db = paymentAdmin([orphan])
    db.hooks.beforeUpdate = () => {
      orphan.metadata = {
        ...(orphan.metadata ?? {}),
        wallee_failure_state: CAPTURED_IDENTITY_BLOCK_STATE,
      }
    }
    adminHolder.client = db.client
    await cancelOrphanedSiblingCoursePayments({
      successfulPaymentId: 'paid-ok',
      tenantId: TENANT,
      courseId: 'course-1',
      email: 'ada@example.com',
    })
    expect(orphan.payment_status).toBe('pending')
    expect(orphan.metadata?.wallee_failure_state).toBe(CAPTURED_IDENTITY_BLOCK_STATE)
    expect(orphan.metadata?.replaced_by_payment_id).toBeUndefined()
  })

  it('C. stale pending and FAILED rows without an identity block are still cancelled', async () => {
    const abandoned = payRow({ id: 'abandoned', metadata: { course_id: 'course-9' } })
    const declined = payRow({
      id: 'declined',
      metadata: { wallee_failure_state: 'FAILED' },
    })
    const completed = payRow({ id: 'completed', payment_status: 'completed', metadata: {} })
    const db = paymentAdmin([abandoned, declined, completed])
    const abandonedResult = await cancelStalePendingWalleePaymentIds(
      db.client,
      ['abandoned', 'completed'],
      'Checkout-Abbruch',
    )
    const declinedResult = await cancelStalePendingWalleePaymentIds(
      db.client,
      ['declined'],
      'Wallee fehlgeschlagen',
    )
    expect(abandonedResult.count).toBe(1)
    expect(declinedResult.count).toBe(1)
    expect(abandoned.payment_status).toBe('cancelled')
    expect(declined.payment_status).toBe('cancelled')
    expect(completed.payment_status).toBe('completed')
  })

  it('D. a FAILED sibling without an identity block is still cleaned up', async () => {
    const failedSibling = payRow({
      id: 'failed-sib',
      payment_status: 'failed',
      metadata: { course_id: 'course-1', email: 'ada@example.com', wallee_failure_state: 'FAILED' },
    })
    const pendingSibling = payRow({
      id: 'pending-sib',
      metadata: { course_id: 'course-1', email: 'ada@example.com' },
    })
    const completed = payRow({
      id: 'paid-ok',
      payment_status: 'completed',
      metadata: { course_id: 'course-1', email: 'ada@example.com' },
    })
    const db = paymentAdmin([failedSibling, pendingSibling, completed])
    adminHolder.client = db.client
    const cancelled = await cancelOrphanedSiblingCoursePayments({
      successfulPaymentId: 'paid-ok',
      tenantId: TENANT,
      courseId: 'course-1',
      email: 'ada@example.com',
    })
    expect(cancelled).toBe(2)
    expect(failedSibling.payment_status).toBe('cancelled')
    expect(pendingSibling.payment_status).toBe('cancelled')
    expect(completed.payment_status).toBe('completed')
    expect(failedSibling.metadata?.wallee_failure_state).toBe('FAILED')
  })

  it('E. an identity block already visible at select is not cancelled', async () => {
    const blocked = payRow({
      id: 'blocked',
      metadata: {
        course_id: 'course-1',
        email: 'ada@example.com',
        wallee_failure_state: CAPTURED_IDENTITY_BLOCK_STATE,
      },
    })
    const db = paymentAdmin([blocked])
    adminHolder.client = db.client
    const split = partitionStalePendingWalleePayments([blocked])
    expect(split.identityBlocked.map((row) => row.id)).toEqual(['blocked'])
    expect([...split.genuineFailure, ...split.abandoned]).toHaveLength(0)

    const cancelled = await cancelOrphanedSiblingCoursePayments({
      successfulPaymentId: 'paid-ok',
      tenantId: TENANT,
      courseId: 'course-1',
      email: 'ada@example.com',
    })
    const recovery = await cancelStalePendingWalleePaymentIds(db.client, ['blocked'], 'Checkout-Abbruch')
    expect(cancelled).toBe(0)
    expect(recovery.count).toBe(0)
    expect(blocked.payment_status).toBe('pending')
    expect(blocked.metadata?.wallee_failure_state).toBe(CAPTURED_IDENTITY_BLOCK_STATE)
  })
})

const OTHER = 'tenant-other'

function registrationUserId(call: unknown): string | null {
  const args = call as { p_registration?: { user_id?: string | null } } | undefined
  return args?.p_registration?.user_id ?? null
}

describe('server payment.user_id reuse', () => {
  it('A. same-tenant student on the payment is reused when email is absent', async () => {
    const student = {
      id: 'student-1',
      role: 'student',
      tenant_id: TENANT,
      email: 'sam@example.com',
      phone: '+41791112233',
    }
    const before = { ...student }
    const db = harness([student])
    const pay = payment({
      user_id: 'student-1',
      metadata: {
        course_id: 'course-1',
        phone: '0791112233',
        firstname: 'Sam',
        lastname: 'Student',
      },
    })
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(result.status).toBe('fulfilled')
    expect(result.registrationId).toBe('reg-1')
    expect(registrationUserId(db.rpcCalls[0])).toBe('student-1')
    expect(db.inserts).toHaveLength(0)
    expect(db.userUpdates).toHaveLength(0)
    expect(db.rows).toEqual([before])
    expect(pay.user_id).toBe('student-1')
    expect(pay.payment_status).toBe('completed')
    expect(pay.metadata.wallee_failure_state).toBeUndefined()
    expect(db.paymentUpdates.some((update) => update.payment_status)).toBe(false)
    const userQueries = db.queries.filter((query) => query.table === 'users')
    expect(userQueries).toEqual([{
      table: 'users',
      filters: [{ op: 'eq', col: 'id', val: 'student-1' }],
    }])
    expect(JSON.stringify(db.queries)).not.toContain(OTHER)
  })

  it('B. same-tenant client on the payment still fulfills', async () => {
    const client = {
      id: 'client-1',
      role: 'client',
      tenant_id: TENANT,
      email: 'ada@example.com',
      phone: '+41790000001',
    }
    const before = { ...client }
    const db = harness([client])
    const pay = payment({
      user_id: 'client-1',
      metadata: {
        course_id: 'course-1',
        email: 'ada@example.com',
        phone: '0790000001',
        firstname: 'Ada',
        lastname: 'Client',
      },
    })
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(result.status).toBe('fulfilled')
    expect(registrationUserId(db.rpcCalls[0])).toBe('client-1')
    expect(db.inserts).toHaveLength(0)
    expect(db.userUpdates).toHaveLength(0)
    expect(db.rows).toEqual([before])
    expect(pay.metadata.wallee_failure_state).toBeUndefined()
  })

  it('C. a payment user from another tenant is not fulfilled', async () => {
    const foreign = {
      id: 'foreign-student',
      role: 'student',
      tenant_id: OTHER,
      email: 'foreign@example.com',
      phone: '+41791112233',
    }
    const local = {
      id: 'local-student',
      role: 'student',
      tenant_id: TENANT,
      email: 'local@example.com',
      phone: '+41791112233',
    }
    const db = harness([foreign, local])
    const pay = payment({
      user_id: 'foreign-student',
      metadata: {
        course_id: 'course-1',
        phone: '0791112233',
        firstname: 'Foreign',
        lastname: 'Student',
      },
    })
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expectBlocked(result, db, pay, 'phone_only')
    expect(registrationUserId(db.rpcCalls[0])).toBeNull()
    expect(pay.user_id).toBe('foreign-student')
    expect(db.rows.map((row) => row.id)).toEqual(['foreign-student', 'local-student'])
    expect(JSON.stringify(db.rpcCalls)).not.toContain('foreign-student')
    expect(db.queries.some((query) => query.filters.some((filter) => filter.val === OTHER))).toBe(false)
  })

  it('D. no payment.user_id still creates one course-tenant client', async () => {
    const db = harness([])
    const pay = payment({
      user_id: null,
      metadata: {
        course_id: 'course-1',
        email: 'new.person@example.com',
        phone: '0792223344',
        firstname: 'New',
        lastname: 'Person',
      },
    })
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(result.status).toBe('fulfilled')
    expect(db.inserts).toHaveLength(1)
    expect(db.inserts[0]).toMatchObject({
      role: 'client',
      tenant_id: TENANT,
      email: 'new.person@example.com',
      auth_user_id: null,
    })
    expect(db.inserts[0]).not.toHaveProperty('onboarding_token')
    expect(registrationUserId(db.rpcCalls[0])).toBe(db.rows[0].id)
    expect(pay.user_id).toBe(db.rows[0].id)
    expect(db.rows[0].role).toBe('client')
  })

  it('E. ambiguous public identity stays blocked without a stored customer', async () => {
    const db = harness([
      { id: 'a', role: 'client', tenant_id: TENANT, email: 'ada@example.com', phone: null },
      { id: 'b', role: 'student', tenant_id: TENANT, email: 'ada@example.com', phone: null },
      { id: 'other-student', role: 'student', tenant_id: TENANT, email: 'other@example.com', phone: '+41790000009' },
    ])
    const ambiguous = payment({
      user_id: null,
      metadata: { course_id: 'course-1', email: 'ada@example.com', firstname: 'Ada', lastname: 'Lovelace' },
    })
    const blocked = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: ambiguous })
    expectBlocked(blocked, db, ambiguous, 'ambiguous_email')

    const disagreed = payment({
      id: 'pay-disagreed',
      user_id: 'other-student',
      metadata: { course_id: 'course-1', email: 'ada@example.com', firstname: 'Ada', lastname: 'Lovelace' },
    })
    const stillBlocked = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: disagreed })
    expect(stillBlocked.status).toBe('identity_blocked')
    expect(db.rpcCalls).toHaveLength(0)
    expect(db.inserts).toHaveLength(0)
    expect(disagreed.user_id).toBe('other-student')
    expect(disagreed.payment_status).toBe('pending')
    expect(db.rows).toHaveLength(3)
  })

  it('F. a captured unresolved identity cannot be cancelled', async () => {
    const db = harness([
      { id: 'owner', role: 'student', tenant_id: TENANT, email: 'owner@example.com', phone: '+41791112233' },
    ])
    const pay = payment()
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expectBlocked(result, db, pay, 'phone_only')
    const split = partitionStalePendingWalleePayments([pay])
    expect(split.identityBlocked.map((row) => row.id)).toEqual([pay.id])
    expect(split.genuineFailure).toHaveLength(0)
    expect(split.abandoned).toHaveLength(0)
    const cancelIds = [...split.genuineFailure, ...split.abandoned].map((row) => row.id)
    expect(cancelIds).not.toContain(pay.id)
    expect(pay.payment_status).toBe('pending')
  })

  it('G. a previously blocked same-tenant student fulfills once on retry', async () => {
    const student = {
      id: 'student-1',
      role: 'student',
      tenant_id: TENANT,
      email: 'sam@example.com',
      phone: '+41791112233',
    }
    const before = { ...student }
    const db = harness([student])
    const pay = payment({
      user_id: 'student-1',
      metadata: {
        course_id: 'course-1',
        phone: '0791112233',
        firstname: 'Sam',
        lastname: 'Student',
        wallee_failure_state: 'identity_blocked',
        identity_block_reason: 'phone_only',
      },
    })
    const split = partitionStalePendingWalleePayments([pay])
    expect(split.identityBlocked.map((row) => row.id)).toEqual(['pay-captured'])
    expect([...split.genuineFailure, ...split.abandoned]).toHaveLength(0)

    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(result.status).toBe('fulfilled')
    expect(result.registrationId).toBe('reg-1')
    expect(registrationUserId(db.rpcCalls[0])).toBe('student-1')
    expect(db.inserts).toHaveLength(0)
    expect(db.userUpdates).toHaveLength(0)
    expect(db.rows).toEqual([before])
    expect(pay.user_id).toBe('student-1')
    expect(pay.payment_status).toBe('completed')
    expect(pay.metadata.wallee_failure_state).toBeUndefined()
    expect(pay.metadata.identity_block_reason).toBe('phone_only')
    expect(pay.metadata.identity_block_resolved_at).toBeTruthy()
    expect(db.paymentUpdates.some((update) => update.payment_status === 'cancelled')).toBe(false)

    db.setRpc({ status: 'already_fulfilled', registration_id: 'reg-1' })
    const replay = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expect(replay.status).toBe('already_fulfilled')
    expect(db.inserts).toHaveLength(0)
    expect(db.userUpdates).toHaveLength(0)
    expect(db.rpcCalls).toHaveLength(2)
    expect(registrationUserId(db.rpcCalls[1])).toBe('student-1')
    expect(db.rows).toEqual([before])
    expect(pay.payment_status).toBe('completed')
  })

  it('same-tenant staff on the payment is not a course customer', async () => {
    const db = harness([
      { id: 'staff-1', role: 'staff', tenant_id: TENANT, email: 'staff@example.com', phone: '+41791112233' },
    ])
    const pay = payment({
      user_id: 'staff-1',
      metadata: {
        course_id: 'course-1',
        phone: '0791112233',
        firstname: 'Staff',
        lastname: 'Member',
      },
    })
    const result = await fulfillCourseWalleePayment({ supabase: db.supabase, payment: pay })
    expectBlocked(result, db, pay, 'staff_contact')
    expect(pay.user_id).toBe('staff-1')
    expect(db.rows[0].role).toBe('staff')
    expect(db.userUpdates).toHaveLength(0)
  })
})
