/**
 * Canonical course-cancellation cascade — unit tests.
 * Uses an in-memory fake Supabase client. Never touches production data.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCourseCancelEmailDedupeKey,
  cancelCourse,
  cancelCourseDatabase,
  cancelCourseDatabaseSequential,
  classifyInvoiceForCourseCancel,
  classifyPaymentForCourseCancel,
  COURSE_CANCEL_EMAIL_STAGE,
} from '../cancel-course'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ACTOR = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const COURSE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const REG1 = '11111111-1111-4111-8111-111111111111'
const REG2 = '22222222-2222-4222-8222-222222222222'
const PAY1 = '33333333-3333-4333-8333-333333333333'
const PAY2 = '44444444-4444-4444-8444-444444444444'
const INV1 = '55555555-5555-4555-8555-555555555555'
const INV2 = '66666666-6666-4666-8666-666666666666'
const ROOM1 = '77777777-7777-4777-8777-777777777777'

type Row = Record<string, unknown>

function statusOf(err: unknown): number | undefined {
  return (err as { statusCode?: number })?.statusCode
}

type FakeOpts = {
  rpcImpl?: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  failUpdate?: Partial<Record<string, string>>
  uniqueOnDedupeInsert?: boolean
}

function makeFakeSupabase(tables: Record<string, Row[]>, opts: FakeOpts = {}): SupabaseClient {
  const store: Record<string, Row[]> = Object.fromEntries(
    Object.entries(tables).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  )
  const inserts: Record<string, Row[]> = {}

  function matches(row: Row, filters: Array<(r: Row) => boolean>) {
    return filters.every((f) => f(row))
  }

  type QueryBuilder = {
    select: (_cols?: string) => QueryBuilder
    eq: (col: string, val: unknown) => QueryBuilder
    neq: (col: string, val: unknown) => QueryBuilder
    in: (col: string, vals: unknown[]) => QueryBuilder
    is: (col: string, _val: null) => QueryBuilder
    contains: (col: string, val: Record<string, unknown>) => QueryBuilder
    or: (expr: string) => QueryBuilder
    limit: (_n: number) => QueryBuilder
    update: (payload: Row) => QueryBuilder
    insert: (payload: Row | Row[]) => {
      select: () => { maybeSingle: () => Promise<{ data: Row | null; error: null }> }
      then: (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) => Promise<unknown>
    }
    maybeSingle: () => Promise<{ data: Row | null; error: null }>
    single: () => Promise<{ data: Row | null; error: { message: string } | null }>
    then: (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) => Promise<unknown>
  }

  function from(table: string) {
    const filters: Array<(r: Row) => boolean> = []
    let pendingUpdate: Row | null = null
    let orFilter: ((r: Row) => boolean) | null = null

    const builder: QueryBuilder = {
      select(_cols?: string) {
        return builder
      },
      eq(col: string, val: unknown) {
        filters.push((r) => r[col] === val)
        return builder
      },
      neq(col: string, val: unknown) {
        filters.push((r) => r[col] !== val)
        return builder
      },
      in(col: string, vals: unknown[]) {
        filters.push((r) => vals.includes(r[col]))
        return builder
      },
      is(col: string, _val: null) {
        filters.push((r) => r[col] == null)
        return builder
      },
      contains(col: string, val: Record<string, unknown>) {
        filters.push((r) => {
          const ctx = (r[col] || {}) as Record<string, unknown>
          return Object.entries(val).every(([k, v]) => ctx[k] === v)
        })
        return builder
      },
      or(expr: string) {
        orFilter = (r) => expr.includes(String(r.id || ''))
        return builder
      },
      limit(_n: number) {
        return builder
      },
      update(payload: Row) {
        pendingUpdate = payload
        return builder
      },
      insert(payload: Row | Row[]) {
        const rows = Array.isArray(payload) ? payload : [payload]
        const activeStatuses = new Set(['pending', 'sending', 'sent'])

        for (const row of rows) {
          if (
            table === 'outbound_messages_queue'
            && opts.uniqueOnDedupeInsert !== false
            && row.dedupe_key
            && activeStatuses.has(String(row.status || 'pending'))
          ) {
            const conflict = (store[table] || []).some(
              (existing) =>
                existing.tenant_id === row.tenant_id
                && existing.dedupe_key === row.dedupe_key
                && activeStatuses.has(String(existing.status)),
            )
            if (conflict) {
              return {
                select() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { code: '23505', message: 'duplicate key' } as { code: string; message: string },
                    }),
                  }
                },
                then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
                  return Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                  }).then(resolve, reject)
                },
              }
            }
          }
        }

        inserts[table] = inserts[table] || []
        for (const row of rows) {
          const withId = { id: row.id || crypto.randomUUID(), ...row }
          inserts[table].push(withId)
          store[table] = store[table] || []
          store[table].push(withId)
        }
        return {
          select() {
            return {
              maybeSingle: async () => ({ data: inserts[table]?.[inserts[table].length - 1] || null, error: null }),
            }
          },
          then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
            return Promise.resolve({ data: null, error: null }).then(resolve, reject)
          },
        }
      },
      maybeSingle: async () => {
        const rows = (store[table] || []).filter((r) => matches(r, filters) && (!orFilter || orFilter(r)))
        return { data: rows[0] || null, error: null }
      },
      single: async () => {
        const rows = (store[table] || []).filter((r) => matches(r, filters) && (!orFilter || orFilter(r)))
        return { data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } }
      },
      then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
        if (pendingUpdate) {
          if (opts.failUpdate?.[table]) {
            return Promise.resolve({ data: null, error: { message: opts.failUpdate[table] } }).then(resolve, reject)
          }
          const updated: Row[] = []
          store[table] = (store[table] || []).map((r) => {
            if (matches(r, filters) && (!orFilter || orFilter(r))) {
              const next = { ...r, ...pendingUpdate }
              updated.push(next)
              return next
            }
            return r
          })
          pendingUpdate = null
          return Promise.resolve({ data: updated, error: null }).then(resolve, reject)
        }
        const rows = (store[table] || []).filter((r) => matches(r, filters) && (!orFilter || orFilter(r)))
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  const client = {
    from,
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (opts.rpcImpl) return opts.rpcImpl(name, args)
      return { data: null, error: { code: 'PGRST202', message: 'Could not find the function cancel_course_database_cascade' } }
    },
    __store: store,
    __inserts: inserts,
  }
  return client as unknown as SupabaseClient
}

function baseTables(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    courses: [
      {
        id: COURSE,
        tenant_id: TENANT,
        status: 'active',
        name: 'Test Course',
        description: 'Room A',
        sari_managed: false,
        is_active: true,
        course_sessions: [
          { id: 's1', start_time: '2026-10-12T07:00:00Z', end_time: '2026-10-12T15:00:00Z', session_number: 1 },
        ],
        tenants: {
          id: TENANT,
          name: 'Demo Tenant',
          contact_email: 'office@example.com',
          primary_color: '#dc2626',
          sari_enabled: false,
        },
      },
    ],
    course_registrations: [
      {
        id: REG1,
        course_id: COURSE,
        tenant_id: TENANT,
        status: 'confirmed',
        payment_id: PAY1,
        invoice_id: INV1,
        email: 'a@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        user_id: 'u1',
        deleted_at: null,
      },
      {
        id: REG2,
        course_id: COURSE,
        tenant_id: TENANT,
        status: 'confirmed',
        payment_id: PAY2,
        invoice_id: INV2,
        email: 'b@example.com',
        first_name: 'Bob',
        last_name: 'Builder',
        user_id: 'u2',
        deleted_at: null,
      },
    ],
    payments: [
      {
        id: PAY1,
        tenant_id: TENANT,
        course_registration_id: REG1,
        invoice_id: INV1,
        payment_status: 'invoiced',
        paid_at: null,
        amount_paid_rappen: null,
      },
      {
        id: PAY2,
        tenant_id: TENANT,
        course_registration_id: REG2,
        invoice_id: INV2,
        payment_status: 'invoiced',
        paid_at: null,
        amount_paid_rappen: 0,
      },
    ],
    invoices: [
      {
        id: INV1,
        tenant_id: TENANT,
        status: 'sent',
        payment_status: 'pending',
        paid_at: null,
        paid_amount_rappen: 0,
        notes: null,
      },
      {
        id: INV2,
        tenant_id: TENANT,
        status: 'sent',
        payment_status: 'pending',
        paid_at: null,
        paid_amount_rappen: 0,
        notes: null,
      },
    ],
    course_invoice_bindings: [
      { id: 'b1', registration_id: REG1, invoice_id: INV1 },
      { id: 'b2', registration_id: REG2, invoice_id: INV2 },
    ],
    room_bookings: [
      { id: ROOM1, course_id: COURSE, tenant_id: TENANT, status: 'confirmed' },
    ],
    vehicle_bookings: [],
    outbound_messages_queue: [],
    audit_logs: [],
    ...overrides,
  }
}

describe('classifyPaymentForCourseCancel / classifyInvoiceForCourseCancel', () => {
  it('cancels unpaid invoiced obligations', () => {
    expect(classifyPaymentForCourseCancel({ payment_status: 'invoiced' })).toBe('cancel')
    expect(classifyPaymentForCourseCancel({ payment_status: 'pending' })).toBe('cancel')
    expect(classifyPaymentForCourseCancel({ payment_status: 'failed' })).toBe('cancel')
  })

  it('skips paid/settled/authorized/partially_refunded without inventing refunds', () => {
    expect(classifyPaymentForCourseCancel({ payment_status: 'completed' })).toBe('skip_paid')
    expect(classifyPaymentForCourseCancel({ payment_status: 'paid' })).toBe('skip_paid')
    expect(classifyPaymentForCourseCancel({ payment_status: 'authorized' })).toBe('skip_paid')
    expect(classifyPaymentForCourseCancel({ payment_status: 'partially_refunded' })).toBe('skip_paid')
    expect(classifyPaymentForCourseCancel({ payment_status: 'pending', paid_at: '2026-10-01T00:00:00Z' })).toBe('skip_paid')
  })

  it('noops cancelled/refunded payments', () => {
    expect(classifyPaymentForCourseCancel({ payment_status: 'cancelled' })).toBe('noop')
    expect(classifyPaymentForCourseCancel({ payment_status: 'refunded' })).toBe('noop')
  })

  it('cancels unpaid invoices and skips paid/authorized ones', () => {
    expect(classifyInvoiceForCourseCancel({ status: 'sent', payment_status: 'pending' })).toBe('cancel')
    expect(classifyInvoiceForCourseCancel({ status: 'sent', payment_status: 'paid' })).toBe('skip_paid')
    expect(classifyInvoiceForCourseCancel({ status: 'sent', payment_status: 'authorized' })).toBe('skip_paid')
    expect(classifyInvoiceForCourseCancel({ status: 'cancelled' })).toBe('noop')
  })
})

describe('cancelCourseDatabaseSequential', () => {
  it('cancels course, registrations, unpaid payments/invoices and room bookings', async () => {
    const supabase = makeFakeSupabase(baseTables())
    const result = await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
    expect(result.path).toBe('sequential')
    expect(result.registrationIds).toEqual([REG1, REG2])
    expect(result.paymentIdsCancelled.sort()).toEqual([PAY1, PAY2].sort())
    expect(result.invoiceIdsCancelled.sort()).toEqual([INV1, INV2].sort())
    expect(result.resources.ok).toBe(true)
    expect(result.roomBookingIds).toEqual([ROOM1])
    const store = (supabase as unknown as { __store: Record<string, Row[]> }).__store
    expect(store.courses[0].status).toBe('cancelled')
    expect(store.course_registrations.every((r) => r.status === 'cancelled')).toBe(true)
    expect(store.room_bookings[0].status).toBe('cancelled')
  })

  it('is idempotent on retry', async () => {
    const supabase = makeFakeSupabase(baseTables())
    await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
    const second = await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
    expect(second.alreadyCancelled).toBe(true)
    expect(second.registrationIds).toEqual([])
    expect(second.paymentIdsCancelled).toEqual([])
  })

  it('skips paid invoices/payments without changing them', async () => {
    const tables = baseTables({
      payments: [
        {
          id: PAY1,
          tenant_id: TENANT,
          course_registration_id: REG1,
          invoice_id: INV1,
          payment_status: 'completed',
          paid_at: '2026-10-10T00:00:00Z',
          amount_paid_rappen: 19000,
        },
        {
          id: PAY2,
          tenant_id: TENANT,
          course_registration_id: REG2,
          invoice_id: INV2,
          payment_status: 'authorized',
          paid_at: null,
          amount_paid_rappen: 0,
        },
      ],
      invoices: [
        {
          id: INV1,
          tenant_id: TENANT,
          status: 'sent',
          payment_status: 'paid',
          paid_at: '2026-10-10T00:00:00Z',
          paid_amount_rappen: 19000,
          notes: null,
        },
        {
          id: INV2,
          tenant_id: TENANT,
          status: 'sent',
          payment_status: 'authorized',
          paid_at: null,
          paid_amount_rappen: 0,
          notes: null,
        },
      ],
    })
    const supabase = makeFakeSupabase(tables)
    const result = await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
    expect(result.paymentIdsCancelled).toEqual([])
    expect(result.paymentIdsSkippedPaid.sort()).toEqual([PAY1, PAY2].sort())
    expect(result.invoiceIdsSkippedPaid.sort()).toEqual([INV1, INV2].sort())
    const store = (supabase as unknown as { __store: Record<string, Row[]> }).__store
    expect(store.payments[0].payment_status).toBe('completed')
    expect(store.payments[1].payment_status).toBe('authorized')
    expect(store.invoices[0].status).toBe('sent')
    expect(store.invoices[1].status).toBe('sent')
  })

  it('rejects cross-tenant course ids', async () => {
    const supabase = makeFakeSupabase(baseTables())
    await expect(cancelCourseDatabaseSequential(supabase, OTHER_TENANT, COURSE, ACTOR))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('does not leave payments/invoices mutated when registration update fails after course update', async () => {
    const supabase = makeFakeSupabase(baseTables(), {
      failUpdate: { course_registrations: 'injected registration failure' },
    })

    try {
      await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
      throw new Error('expected rejection')
    } catch (err) {
      expect(statusOf(err)).toBe(500)
    }

    const store = (supabase as unknown as { __store: Record<string, Row[]> }).__store
    expect(store.payments.every((p: Row) => p.payment_status === 'invoiced')).toBe(true)
    expect(store.invoices.every((i: Row) => i.status === 'sent')).toBe(true)
  })

  it('resource booking update failure is visible on sequential result', async () => {
    const supabase = makeFakeSupabase(baseTables(), {
      failUpdate: { room_bookings: 'room update failed' },
    })
    const result = await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
    expect(result.resources.ok).toBe(false)
    expect(result.resources.errors.some((e) => /room/i.test(e))).toBe(true)
  })
})

describe('cancelCourseDatabase fail-closed RPC rules', () => {
  const prev = process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL ?? ''

  afterEach(() => {
    process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL = prev
  })

  it('does not fall back to sequential on a non-missing RPC error', async () => {
    process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL = ''
    const supabase = makeFakeSupabase(baseTables(), {
      rpcImpl: async () => ({ data: null, error: { code: 'XX000', message: 'deadlock detected' } }),
    })
    await expect(cancelCourseDatabase(supabase, TENANT, COURSE, ACTOR))
      .rejects.toMatchObject({ statusCode: 500 })
    const store = (supabase as unknown as { __store: Record<string, Row[]> }).__store
    expect(store.courses[0].status).toBe('active')
  })

  it('blocks sequential when RPC is missing without explicit opt-in', async () => {
    process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL = ''
    const supabase = makeFakeSupabase(baseTables())
    await expect(cancelCourseDatabase(supabase, TENANT, COURSE, ACTOR))
      .rejects.toMatchObject({ statusCode: 503 })
  })

  it('allows sequential only with explicit SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL=1', async () => {
    process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL = '1'
    const supabase = makeFakeSupabase(baseTables())
    const result = await cancelCourseDatabase(supabase, TENANT, COURSE, ACTOR)
    expect(result.path).toBe('sequential')
  })
})

describe('cancelCourse orchestration', () => {
  beforeEach(() => {
    process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL = '1'
  })
  afterEach(() => {
    process.env.SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL = ''
  })

  it('queues participant emails idempotently after DB cascade', async () => {
    const supabase = makeFakeSupabase(baseTables())
    const first = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: true,
      reason: 'Testabsage',
    })

    expect(first.success).toBe(true)
    expect(first.complete).toBe(true)
    expect(first.emails.queued).toBe(2)
    expect(first.database.registrationIds).toHaveLength(2)
    expect(first.manualReviewRequired).toEqual([])

    const queued = (supabase as unknown as { __store: Record<string, Row[]> }).__store.outbound_messages_queue
    expect(queued).toHaveLength(2)
    expect((queued[0].context_data as Row).stage).toBe(COURSE_CANCEL_EMAIL_STAGE)
    expect(queued[0].dedupe_key).toBe(
      buildCourseCancelEmailDedupeKey({ tenantId: TENANT, courseId: COURSE, registrationId: REG1 }),
    )
    expect(queued[0].status).toBe('pending')

    const second = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: true,
    })
    expect(second.emails.queued).toBe(0)
    expect(second.emails.skippedDuplicate).toBe(2)
    expect((supabase as unknown as { __store: Record<string, Row[]> }).__store.outbound_messages_queue).toHaveLength(2)
  })

  it('treats unique-constraint conflict as skipped duplicate (concurrency-safe)', async () => {
    const tables = baseTables()
    const dedupeKey = buildCourseCancelEmailDedupeKey({
      tenantId: TENANT,
      courseId: COURSE,
      registrationId: REG1,
    })
    tables.outbound_messages_queue = [
      {
        id: 'existing-1',
        tenant_id: TENANT,
        channel: 'email',
        status: 'pending',
        dedupe_key: dedupeKey,
        context_data: {
          stage: COURSE_CANCEL_EMAIL_STAGE,
          course_id: COURSE,
          registration_id: REG1,
        },
      },
    ]
    // Only one open reg so we enqueue for REG2; REG1 hits soft dedupe
    tables.course_registrations = [tables.course_registrations[0], tables.course_registrations[1]]
    const supabase = makeFakeSupabase(tables)

    // Pre-cancel regs via sequential so email loop sees cancelled
    await cancelCourseDatabaseSequential(supabase, TENANT, COURSE, ACTOR)
    const result = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: true,
    })
    expect(result.emails.errors).toEqual([])
    expect(result.emails.skippedDuplicate + result.emails.queued).toBeGreaterThan(0)
  })

  it('marks complete=false when email queue insert fails after DB cascade', async () => {
    const tables = baseTables()
    const supabase = makeFakeSupabase(tables)
    const store = (supabase as unknown as { __store: Record<string, Row[]> }).__store
    type FakeClient = SupabaseClient & { from: (table: string) => unknown }
    const client = supabase as FakeClient
    const originalFrom = client.from.bind(client)

    client.from = (table: string) => {
      const builder = originalFrom(table) as Record<string, unknown>
      if (table !== 'outbound_messages_queue') return builder

      return {
        select() { return this },
        eq() { return this },
        contains() { return this },
        in() { return this },
        limit() { return this },
        then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
          return Promise.resolve({ data: [], error: null }).then(resolve, reject)
        },
        insert() {
          return {
            then(resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) {
              return Promise.resolve({ data: null, error: { message: 'queue insert failed' } }).then(resolve, reject)
            },
          }
        },
      }
    }

    const result = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: true,
    })

    expect(result.database.registrationIds.length).toBeGreaterThan(0)
    expect(store.courses[0].status).toBe('cancelled')
    expect(result.emails.errors.length).toBeGreaterThan(0)
    expect(result.complete).toBe(false)
  })

  it('marks complete=false when resource booking cleanup fails', async () => {
    const supabase = makeFakeSupabase(baseTables(), {
      failUpdate: { room_bookings: 'room update failed' },
    })
    const result = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: false,
    })
    expect(result.resources.ok).toBe(false)
    expect(result.complete).toBe(false)
    expect(result.warnings.some((w) => /Ressourcen/i.test(w))).toBe(true)
  })

  it('records manualReviewRequired for authorized payments without mutating them', async () => {
    const tables = baseTables({
      payments: [
        {
          id: PAY1,
          tenant_id: TENANT,
          course_registration_id: REG1,
          invoice_id: INV1,
          payment_status: 'authorized',
          paid_at: null,
          amount_paid_rappen: 0,
        },
        {
          id: PAY2,
          tenant_id: TENANT,
          course_registration_id: REG2,
          invoice_id: INV2,
          payment_status: 'invoiced',
          paid_at: null,
          amount_paid_rappen: 0,
        },
      ],
    })
    const supabase = makeFakeSupabase(tables)
    const result = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: false,
    })
    expect(result.database.paymentIdsSkippedPaid).toContain(PAY1)
    expect(result.database.paymentIdsCancelled).toContain(PAY2)
    expect(result.manualReviewRequired.some((m) => m.id === PAY1 && m.kind === 'payment')).toBe(true)
    const store = (supabase as unknown as { __store: Record<string, Row[]> }).__store
    expect(store.payments.find((p) => p.id === PAY1)?.payment_status).toBe('authorized')
  })

  it('uses RPC result when available', async () => {
    const supabase = makeFakeSupabase(baseTables(), {
      rpcImpl: async () => ({
        data: {
          course_id: COURSE,
          tenant_id: TENANT,
          already_cancelled: false,
          registration_ids: [REG1],
          payment_ids_cancelled: [PAY1],
          payment_ids_skipped_paid: [],
          invoice_ids_cancelled: [INV1],
          invoice_ids_skipped_paid: [],
          room_booking_ids: [ROOM1],
          vehicle_booking_ids: [],
        },
        error: null,
      }),
    })

    const result = await cancelCourse({
      supabase,
      tenantId: TENANT,
      actorId: ACTOR,
      courseId: COURSE,
      notifyParticipants: false,
    })
    expect(result.database.path).toBe('rpc')
    expect(result.database.registrationIds).toEqual([REG1])
    expect(result.emails.queued).toBe(0)
    expect(result.complete).toBe(true)
  })
})

describe('source contracts — UI and API wiring', () => {
  it('status-change UI routes cancelled to cancelCourse modal', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const ui = readFileSync(resolve(process.cwd(), 'pages/admin/courses.vue'), 'utf8')
    expect(ui).toMatch(/cancelCourse\(/)
    expect(ui).toMatch(/newStatusForLogging === 'cancelled'/)
  })

  it('update-status delegates cancelled to cancelCourseWithFollowUps (SARI+staff)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(process.cwd(), 'server/api/courses/update-status.post.ts'), 'utf8')
    expect(src).toContain('cancelCourseWithFollowUps')
    expect(src).not.toMatch(/await cancelCourse\(/)
  })

  it('cancel-course API uses cancelCourseWithFollowUps and does not write cancelled_at on registrations', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(process.cwd(), 'server/api/admin/courses/cancel-course.post.ts'), 'utf8')
    expect(src).toContain('cancelCourseWithFollowUps')
    expect(src).not.toMatch(/cancelled_at/)
  })

  it('RPC SQL skips authorized and partially_refunded payments', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const sql = readFileSync(resolve(process.cwd(), 'sql_migrations/20261011_cancel_course_cascade_rpc.sql'), 'utf8')
    expect(sql).toContain("'authorized'")
    expect(sql).toContain("'partially_refunded'")
    expect(sql).toContain('GRANT EXECUTE')
    expect(sql).toContain('REVOKE ALL')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('search_path = public')
  })

  it('outbox dedupe migration adds partial unique index (file only)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const sql = readFileSync(resolve(process.cwd(), 'migrations/20261011_outbound_messages_course_cancel_dedupe.sql'), 'utf8')
    expect(sql).toContain('outbound_messages_queue_course_cancel_dedupe_uidx')
    expect(sql).toContain('dedupe_key')
    expect(sql).toMatch(/pending.*sending.*sent/s)
  })
})
