import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  requireAdminProfile: vi.fn(),
  getAuthUserFromRequest: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  createClient: vi.fn(),
  getQuery: vi.fn(),
  readBody: vi.fn(),
  applyInvoiceCreditOnPaid: vi.fn(async () => ({ applied_rappen: 0 })),
  applyStaffPosCreditsForPaidInvoice: vi.fn(async () => ({ credited: 0 })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getQuery: mocks.getQuery,
    readBody: mocks.readBody,
    createError: (err: { statusCode?: number; statusMessage?: string; message?: string }) => {
      const error = new Error(err.statusMessage || err.message || 'error')
      return Object.assign(error, err, {
        statusCode: err.statusCode,
        statusMessage: err.statusMessage || err.message,
        message: err.message || err.statusMessage,
      })
    },
  }
})

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  requireAdminProfile: mocks.requireAdminProfile,
}))

vi.mock('~/server/utils/auth-helper', () => ({
  getAuthUserFromRequest: mocks.getAuthUserFromRequest,
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/utils/logger', () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return { default: logger, logger }
})

vi.mock('~/server/utils/invoice-credit', () => ({
  applyInvoiceCreditOnPaid: mocks.applyInvoiceCreditOnPaid,
}))

vi.mock('~/server/utils/staff-pos-completion', () => ({
  applyStaffPosCreditsForPaidInvoice: mocks.applyStaffPosCreditsForPaidInvoice,
}))

vi.mock('~/server/utils/apply-student-credit', () => ({
  applyStudentCreditToPayments: vi.fn(),
}))

type Handler = (event: unknown) => Promise<unknown>

let getItems: Handler
let lookupInvoice: Handler
let markPaid: Handler
let markInvoicePaid: Handler
let processBulk: Handler

beforeAll(async () => {
  getItems = (await import('~/server/api/invoices/get-items.get')).default
  lookupInvoice = (await import('~/server/api/admin/payment-invoice-lookup.get')).default
  markPaid = (await import('~/server/api/invoices/mark-paid.post')).default
  markInvoicePaid = (await import('~/server/api/invoices/mark-invoice-paid.post')).default
  processBulk = (await import('~/server/api/staff/process-bulk-payment.post')).default
})

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const USER_A = '33333333-3333-4333-8333-333333333333'
const AUTH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const INVOICE_A = '44444444-4444-4444-8444-444444444444'
const INVOICE_B = '55555555-5555-4555-8555-555555555555'
const UNKNOWN_INVOICE = 'abcdefab-1234-4abc-8abc-abcdefabcdef'
const PAY_A = '66666666-6666-4666-8666-666666666666'
const PAY_A2 = '66666666-6666-4666-8666-666666666667'
const PAY_B = '77777777-7777-4777-8777-777777777777'
const APPT_A = '99999999-9999-4999-8999-999999999999'
const APPT_NULL = '99999999-9999-4999-8999-999999999998'
const APPT_B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SECRET = 'FOREIGN-SECRET-ACME'
const FOREIGN_NUMBER = 'RE-FOREIGN-999'
const SHARED_NUMBER = 'RE-1001'

type Row = Record<string, unknown>
type Filter =
  | { op: 'eq'; col: string; val: unknown }
  | { op: 'in'; col: string; val: unknown[] }
  | { op: 'is'; col: string; val: unknown }
  | { op: 'not'; col: string; kind: string; val: unknown }
  | { op: 'or'; expr: string }

type WriteLog = { table: string; op: 'insert' | 'update'; payload: Row | null; matched: number }

function matchOr(row: Row, expr: string) {
  return expr.split(',').some((part) => {
    const match = part.match(/^([a-z0-9_]+)\.(eq|is)\.(.+)$/i)
    if (!match) return false
    const [, col, op, raw] = match
    if (op === 'is' && raw === 'null') return row[col] == null
    if (op === 'eq') return row[col] === raw
    return false
  })
}

function matches(row: Row, filters: Filter[]) {
  return filters.every((filter) => {
    if (filter.op === 'eq') return row[filter.col] === filter.val
    if (filter.op === 'in') return filter.val.includes(row[filter.col])
    if (filter.op === 'is') return filter.val === null ? row[filter.col] == null : row[filter.col] === filter.val
    if (filter.op === 'or') return matchOr(row, filter.expr)
    if (filter.op === 'not' && filter.kind === 'is') {
      return filter.val === null ? row[filter.col] != null : row[filter.col] !== filter.val
    }
    return false
  })
}

function createDb(seed: Record<string, Row[]>, opts?: { skipUpdates?: string[]; rpcError?: boolean; rpcNull?: boolean; failJournal?: boolean }) {
  const tables: Record<string, Row[]> = structuredClone(seed)
  const writes: WriteLog[] = []
  const reads: string[] = []
  const skip = new Set(opts?.skipUpdates || [])

  function from(table: string) {
    if (!tables[table]) tables[table] = []
    const state: { filters: Filter[]; op: 'select' | 'insert' | 'update'; payload: Row | Row[] | null; orderCol: string | null } = {
      filters: [],
      op: 'select',
      payload: null,
      orderCol: null,
    }

    const execute = () => {
      if (state.op === 'insert') {
        const incoming = Array.isArray(state.payload) ? state.payload : [state.payload || {}]
        const stored = incoming.map((row) => ({ id: row.id || crypto.randomUUID(), ...row }))
        tables[table].push(...stored)
        writes.push({ table, op: 'insert', payload: stored[0] || null, matched: stored.length })
        return { data: stored.map((row) => ({ ...row })), error: null }
      }

      if (state.op === 'update' && skip.has(table)) {
        writes.push({
          table,
          op: 'update',
          payload: state.payload && !Array.isArray(state.payload) ? { ...state.payload } : null,
          matched: 0,
        })
        return { data: [], error: null }
      }

      let matched = tables[table].filter((row) => matches(row, state.filters))
      if (state.op === 'update' && state.payload && !Array.isArray(state.payload)) {
        for (const row of matched) Object.assign(row, state.payload)
        writes.push({ table, op: 'update', payload: { ...state.payload }, matched: matched.length })
      } else if (state.op === 'select') {
        reads.push(table)
      }

      if (state.orderCol) {
        const col = state.orderCol
        matched = [...matched].sort((a, b) => Number(a[col] ?? 0) - Number(b[col] ?? 0))
      }
      return { data: matched.map((row) => ({ ...row })), error: null }
    }

    const finishSingle = (allowEmpty: boolean) => {
      const result = execute()
      if (result.data.length === 1) return { data: result.data[0], error: null }
      if (result.data.length === 0 && allowEmpty) return { data: null, error: null }
      return { data: null, error: { code: 'PGRST116', message: 'row count' } }
    }

    const chain = {
      select: () => chain,
      insert: (payload: Row | Row[]) => { state.op = 'insert'; state.payload = payload; return chain },
      update: (payload: Row) => { state.op = 'update'; state.payload = payload; return chain },
      eq: (col: string, val: unknown) => { state.filters.push({ op: 'eq', col, val }); return chain },
      in: (col: string, val: unknown[]) => { state.filters.push({ op: 'in', col, val }); return chain },
      is: (col: string, val: unknown) => { state.filters.push({ op: 'is', col, val }); return chain },
      not: (col: string, kind: string, val: unknown) => { state.filters.push({ op: 'not', col, kind, val }); return chain },
      or: (expr: string) => { state.filters.push({ op: 'or', expr }); return chain },
      order: (col: string) => { state.orderCol = col; return chain },
      limit: () => chain,
      single: async () => finishSingle(false),
      maybeSingle: async () => finishSingle(true),
      then: (onFulfilled: (value: { data: Row[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(execute()).then(onFulfilled, onRejected),
    }
    return chain
  }

  function siblings(invoiceId: unknown, tenantId: unknown) {
    return (tables.payments || []).filter((row) =>
      row.invoice_id === invoiceId && (row.tenant_id === tenantId || row.tenant_id == null),
    )
  }

  // In-memory stand-in for the SQL functions. It is not a database transaction.
  // Disposable Postgres coverage lives in payment-settlement-atomicity.pg.test.ts.
  async function rpc(name: string, args: Record<string, unknown>) {
    if (opts?.rpcError) return { data: null, error: { message: 'sibling read failed', code: 'XX000' } }
    if (opts?.rpcNull) return { data: null, error: null }
    const snapshot = structuredClone(tables)
    const writesBefore = writes.length
    try {
      return { data: applyMockSettlement(name, args), error: null }
    } catch (error) {
      for (const key of ['users', 'payments', 'invoices', 'invoice_payments', 'invoice_items', 'appointments', 'product_sales']) {
        tables[key] = snapshot[key] || []
      }
      writes.splice(writesBefore)
      return { data: null, error: { message: (error as Error).message, code: 'XX000' } }
    }
  }

  function applyMockSettlement(name: string, args: Record<string, unknown>) {
    const actor = (tables.users || []).find((row) => row.id === args.p_actor_user_id)
    if (!actor?.tenant_id) throw new Error('forbidden')

    if (name === 'complete_tenant_cash_payment') {
      const payment = (tables.payments || []).find((row) => row.id === args.p_payment_id && row.tenant_id === actor.tenant_id)
      if (!payment) throw new Error('payment_not_found')
      if ((payment.metadata as { source?: string } | undefined)?.source === 'staff_product_sale') {
        throw new Error('staff_pos_payment')
      }
      if (payment.invoice_id) {
        const owned = (tables.invoices || []).find((row) => row.id === payment.invoice_id && row.tenant_id === actor.tenant_id)
        if (!owned) throw new Error('invoice_not_found')
      }
      const replayed = payment.payment_status === 'completed' && payment.payment_method === 'cash'
      if (!replayed) {
        Object.assign(payment, {
          payment_status: 'completed',
          payment_method: 'cash',
          paid_at: args.p_paid_at,
          updated_at: args.p_paid_at,
        })
        writes.push({ table: 'payments', op: 'update', payload: { payment_status: 'completed', payment_method: 'cash' }, matched: 1 })
      }
      let invoiceStatus: string | null = null
      if (actor.role === 'admin' && payment.invoice_id) {
        if (skip.has('invoices')) throw new Error('invoice_not_found')
        const rows = siblings(payment.invoice_id, actor.tenant_id)
        const allPaid = rows.every((row) => row.payment_status === 'completed')
        const invoice = (tables.invoices || []).find((row) => row.id === payment.invoice_id && row.tenant_id === actor.tenant_id)
        if (!invoice) throw new Error('invoice_not_found')
        const payload: Row = {
          payment_status: allPaid ? 'paid' : 'partial',
          updated_at: args.p_paid_at,
          ...(allPaid ? { paid_at: args.p_paid_at } : {}),
        }
        Object.assign(invoice, payload)
        writes.push({ table: 'invoices', op: 'update', payload, matched: 1 })
        invoiceStatus = String(payload.payment_status)
      }
      return { ok: true, payment_id: payment.id, replayed, invoice_payment_status: invoiceStatus }
    }

    if (name === 'settle_marked_invoice_payment_idempotent') {
      const key = typeof args.p_idempotency_key === 'string' ? args.p_idempotency_key.trim() : ''
      const invoice = (tables.invoices || []).find((row) => row.id === args.p_invoice_id && row.tenant_id === actor.tenant_id)
      if (!invoice) throw new Error('invoice_not_found')
      const total = Number(invoice.total_amount_rappen || 0)
      const requested = args.p_paid_amount_rappen == null || Number(args.p_paid_amount_rappen) === 0
        ? total
        : Number(args.p_paid_amount_rappen)
      if (key) {
        const existing = (tables.invoice_payments || []).find((row) => row.tenant_id === actor.tenant_id && row.idempotency_key === key)
        if (existing) {
          if (Number(existing.amount_rappen) !== requested) throw new Error('idempotency_amount_mismatch')
          return {
            ok: true,
            replayed: true,
            invoice_id: invoice.id,
            paid_amount_rappen: Number(invoice.paid_amount_rappen || 0),
            is_partial: invoice.payment_status !== 'paid',
          }
        }
      }
      const settled = applyMockSettlement('settle_marked_invoice_payment', args) as Row
      if (key && settled.replayed !== true) {
        const journal = (tables.invoice_payments || [])[(tables.invoice_payments || []).length - 1]
        if (journal) journal.idempotency_key = key
      }
      return settled
    }

    if (name === 'settle_marked_invoice_payment') {
      const invoice = (tables.invoices || []).find((row) => row.id === args.p_invoice_id && row.tenant_id === actor.tenant_id)
      if (!invoice) throw new Error('invoice_not_found')
      if (skip.has('invoices')) throw new Error('invoice_not_found')
      const total = Number(invoice.total_amount_rappen || 0)
      const requested = args.p_paid_amount_rappen == null || Number(args.p_paid_amount_rappen) === 0
        ? total
        : Number(args.p_paid_amount_rappen)
      const previous = Number(invoice.paid_amount_rappen || 0)
      if (invoice.payment_status === 'paid' && previous >= total && !args.p_camt_dedupe_key) {
        return { ok: true, replayed: true, invoice_id: invoice.id, paid_amount_rappen: previous, is_partial: false }
      }
      const clamped = Math.min(previous + requested, total)
      const isPartial = clamped < total
      Object.assign(invoice, {
        payment_status: isPartial ? 'partial' : 'paid',
        status: isPartial ? 'sent' : 'paid',
        paid_at: args.p_paid_at,
        paid_amount_rappen: clamped,
        ...(args.p_note ? { internal_notes: args.p_note } : {}),
        ...(!isPartial ? { dunning_level: 0, dunning_paused: false } : {}),
      })
      writes.push({ table: 'invoices', op: 'update', payload: { paid_amount_rappen: clamped }, matched: 1 })
      if (opts?.failJournal) throw new Error('journal_failed')
      const journal = {
        invoice_id: invoice.id,
        tenant_id: actor.tenant_id,
        amount_rappen: requested,
        payment_method: args.p_payment_method || args.p_note || 'manual',
        notes: args.p_note || null,
        status: 'completed',
        currency: 'CHF',
      }
      tables.invoice_payments = tables.invoice_payments || []
      tables.invoice_payments.push(journal)
      writes.push({ table: 'invoice_payments', op: 'insert', payload: journal, matched: 1 })
      if (!isPartial) {
        for (const payment of tables.payments || []) {
          const open = ['invoice', 'invoiced', 'pending', 'open', 'failed', 'partial'].includes(String(payment.payment_status))
          if (!open || payment.tenant_id !== invoice.tenant_id) continue
          if (payment.invoice_id === invoice.id) {
            payment.payment_status = 'completed'
          }
        }
        const appointmentIds = new Set(
          (tables.invoice_items || [])
            .filter((item) => item.invoice_id === invoice.id && item.appointment_id && (item.tenant_id === actor.tenant_id || item.tenant_id == null))
            .map((item) => item.appointment_id),
        )
        for (const payment of tables.payments || []) {
          const open = ['invoice', 'invoiced', 'pending', 'open', 'failed', 'partial'].includes(String(payment.payment_status))
          if (!open || payment.tenant_id !== invoice.tenant_id || payment.user_id !== invoice.user_id) continue
          if (appointmentIds.has(payment.appointment_id)) payment.payment_status = 'completed'
        }
      }
      return { ok: true, replayed: false, invoice_id: invoice.id, paid_amount_rappen: clamped, is_partial: isPartial }
    }

    if (name === 'apply_cash_settlement_batch') {
      if (actor.is_active !== true) throw new Error('forbidden')
      const applied: Array<Record<string, unknown>> = []
      for (const update of (args.p_payment_updates as Array<Record<string, unknown>>) || []) {
        const payment = (tables.payments || []).find((row) => row.id === update.payment_id && row.tenant_id === actor.tenant_id)
        if (!payment) throw new Error('payment_not_found')
        if (payment.payment_status === 'completed') {
          applied.push({ payment_id: payment.id, skipped: true })
          continue
        }
        Object.assign(payment, {
          payment_method: update.payment_method,
          payment_status: update.payment_status,
          amount_paid_rappen: update.amount_paid_rappen,
          ...(update.payment_status === 'completed' ? { paid_at: args.p_now } : {}),
          ...(update.metadata ? { metadata: update.metadata } : {}),
        })
        writes.push({
          table: 'payments',
          op: 'update',
          payload: { payment_status: update.payment_status as string, amount_paid_rappen: update.amount_paid_rappen as number },
          matched: 1,
        })
        applied.push({ payment_id: payment.id, skipped: false, payment_status: update.payment_status })
      }
      if (['admin', 'tenant_admin', 'super_admin', 'superadmin'].includes(String(actor.role))) {
        const invoiceIds = new Set(
          (tables.payments || [])
            .filter((row) => row.tenant_id === actor.tenant_id && row.invoice_id && applied.some((item) => item.payment_id === row.id))
            .map((row) => row.invoice_id),
        )
        for (const invoiceId of invoiceIds) {
          const rows = siblings(invoiceId, actor.tenant_id)
          const allPaid = rows.length > 0 && rows.every((row) => row.payment_status === 'completed')
          const anyPaid = rows.some((row) => row.payment_status === 'completed' || row.payment_status === 'partial')
          if (!anyPaid) continue
          if (skip.has('invoices')) throw new Error('invoice_not_in_tenant')
          const invoice = (tables.invoices || []).find((row) => row.id === invoiceId && row.tenant_id === actor.tenant_id)
          if (!invoice) throw new Error('invoice_not_in_tenant')
          const payload: Row = {
            payment_status: allPaid ? 'paid' : 'partial',
            ...(allPaid ? { paid_at: args.p_now } : {}),
          }
          Object.assign(invoice, payload)
          writes.push({ table: 'invoices', op: 'update', payload, matched: 1 })
        }
      }
      return { ok: true, applied }
    }

    throw new Error(`unknown rpc ${name}`)
  }

  return { tables, writes, reads, from, rpc }
}

type MemoryDb = ReturnType<typeof createDb>

let db: MemoryDb

function staffUser(role = 'admin', tenantId = TENANT_A) {
  return { id: USER_A, auth_user_id: AUTH_A, tenant_id: tenantId, role, is_active: true }
}

function invoice(partial: Row): Row {
  return {
    id: INVOICE_A,
    tenant_id: TENANT_A,
    user_id: USER_A,
    invoice_number: SHARED_NUMBER,
    total_amount_rappen: 10000,
    paid_amount_rappen: 0,
    payment_status: 'pending',
    status: 'sent',
    dunning_level: 2,
    dunning_paused: true,
    billing_company_name: 'Driving Team',
    ...partial,
  }
}

function payment(partial: Row): Row {
  return {
    id: PAY_A,
    tenant_id: TENANT_A,
    user_id: USER_A,
    invoice_id: null,
    invoice_number: null,
    appointment_id: null,
    total_amount_rappen: 5000,
    admin_fee_rappen: 0,
    credit_used_rappen: 0,
    amount_paid_rappen: 0,
    payment_status: 'pending',
    payment_method: 'invoice',
    metadata: {},
    created_at: '2026-10-01T00:00:00.000Z',
    appointments: null,
    ...partial,
  }
}

async function rejectionOf(run: () => Promise<unknown>) {
  try {
    await run()
  } catch (error) {
    return error as { statusCode?: number; message?: string; statusMessage?: string }
  }
  throw new Error('expected the handler to reject')
}

beforeEach(() => {
  vi.clearAllMocks()
  db = createDb({ users: [staffUser()] })
  mocks.getSupabaseAdmin.mockImplementation(() => db)
  mocks.createClient.mockImplementation(() => db)
  mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH_A, db_user_id: USER_A, tenant_id: TENANT_A })
  mocks.requireAdminProfile.mockResolvedValue({ id: USER_A, tenant_id: TENANT_A, role: 'admin' })
  mocks.getAuthUserFromRequest.mockResolvedValue({ id: AUTH_A })
  mocks.getQuery.mockReturnValue({})
  mocks.readBody.mockResolvedValue({})
})

describe('invoice item tenant scope', () => {
  it('returns items only after the invoice matches the authenticated tenant', async () => {
    db = createDb({
      invoices: [invoice({})],
      invoice_items: [{ id: 'item-a', invoice_id: INVOICE_A, tenant_id: null, sort_order: 1, product_name: 'Fahrstunde' }],
    })
    mocks.getQuery.mockReturnValue({ invoice_id: INVOICE_A, tenant_id: TENANT_B })

    const result = await getItems({})

    expect(result).toMatchObject({ success: true, data: [expect.objectContaining({ id: 'item-a', product_name: 'Fahrstunde' })] })
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it('hides a same invoice id that belongs to another tenant and an unknown id', async () => {
    db = createDb({
      invoices: [invoice({ id: INVOICE_B, tenant_id: TENANT_B, billing_company_name: SECRET, invoice_number: FOREIGN_NUMBER })],
      invoice_items: [{ id: 'item-b', invoice_id: INVOICE_B, tenant_id: TENANT_B, product_name: SECRET, sort_order: 1 }],
    })
    mocks.getQuery.mockReturnValue({ invoice_id: INVOICE_B, tenant_id: TENANT_B })

    const foreign = await rejectionOf(() => getItems({}))
    expect(foreign.statusCode).toBe(404)
    expect(JSON.stringify(foreign)).not.toContain(SECRET)
    expect(JSON.stringify(foreign)).not.toContain(FOREIGN_NUMBER)
    expect(db.reads).not.toContain('invoice_items')

    mocks.getQuery.mockReturnValue({ invoice_id: UNKNOWN_INVOICE })
    const unknown = await rejectionOf(() => getItems({}))
    expect(unknown.statusCode).toBe(404)
    expect(JSON.stringify(unknown)).not.toContain(UNKNOWN_INVOICE)
  })

  it('does not merge another tenant product sale into the invoice lines', async () => {
    db = createDb({
      invoices: [invoice({})],
      invoice_items: [{
        id: 'lesson',
        invoice_id: INVOICE_A,
        tenant_id: TENANT_A,
        appointment_id: APPT_A,
        sort_order: 1,
        product_name: 'Fahrstunde',
        total_price_rappen: 8000,
        unit_price_rappen: 8000,
        quantity: 1,
      }],
      product_sales: [
        { appointment_id: APPT_A, tenant_id: TENANT_A, product_id: 'prod-a', quantity: 1, total_price_rappen: 1500, products: { id: 'prod-a', name: 'Lehrmittel' } },
        { appointment_id: APPT_A, tenant_id: TENANT_B, product_id: 'prod-b', quantity: 1, total_price_rappen: 9000, products: { id: 'prod-b', name: SECRET } },
      ],
    })
    mocks.getQuery.mockReturnValue({ invoice_id: INVOICE_A })

    const result = await getItems({}) as { data: Array<{ product_name?: string }> }
    const names = result.data.map((row) => row.product_name)
    expect(names).toContain('Lehrmittel')
    expect(names).not.toContain(SECRET)
  })
})

describe('payment invoice lookup tenant scope', () => {
  it('returns the invoice for this tenant when the invoice number also exists elsewhere', async () => {
    db = createDb({
      payments: [
        payment({ id: PAY_A, invoice_number: SHARED_NUMBER, appointment_id: APPT_A }),
        payment({ id: PAY_B, tenant_id: TENANT_B, invoice_number: SHARED_NUMBER, appointment_id: APPT_B }),
      ],
      appointments: [
        { id: APPT_A, tenant_id: TENANT_A },
        { id: APPT_B, tenant_id: TENANT_B },
      ],
      invoices: [
        invoice({ invoice_number: SHARED_NUMBER, billing_company_name: 'Team A' }),
        invoice({ id: INVOICE_B, tenant_id: TENANT_B, invoice_number: SHARED_NUMBER, billing_company_name: SECRET }),
      ],
    })
    mocks.getQuery.mockReturnValue({ invoice_number: SHARED_NUMBER, tenant_id: TENANT_B })

    const result = await lookupInvoice({}) as { success: boolean; invoice: Row }
    expect(result.success).toBe(true)
    expect(result.invoice.id).toBe(INVOICE_A)
    expect(result.invoice.billing_company_name).toBe('Team A')
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it('does not reveal a foreign invoice number or appointment payment', async () => {
    db = createDb({
      payments: [payment({ id: PAY_B, tenant_id: TENANT_B, invoice_number: FOREIGN_NUMBER, appointment_id: APPT_B })],
      appointments: [{ id: APPT_B, tenant_id: TENANT_B }],
      invoices: [invoice({ id: INVOICE_B, tenant_id: TENANT_B, invoice_number: FOREIGN_NUMBER, billing_company_name: SECRET })],
    })
    mocks.getQuery.mockReturnValue({ invoice_number: FOREIGN_NUMBER, tenant_id: TENANT_B })

    const byNumber = await rejectionOf(() => lookupInvoice({}))
    expect(byNumber.statusCode).toBe(404)
    expect(byNumber.statusMessage).toBe('Invoice not found')
    expect(JSON.stringify(byNumber)).not.toContain(FOREIGN_NUMBER)
    expect(JSON.stringify(byNumber)).not.toContain(SECRET)
    expect(db.writes).toHaveLength(0)

    mocks.getQuery.mockReturnValue({ appointment_id: APPT_B })
    const byAppointment = await lookupInvoice({}) as { payment: Row | null }
    expect(byAppointment.payment).toBeNull()
    expect(JSON.stringify(byAppointment)).not.toContain(FOREIGN_NUMBER)
  })
})

describe('mark-paid tenant scope', () => {
  it('keeps the cash completion payload for a same-tenant admin payment', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_A, total_amount_rappen: 5000 })],
      invoices: [invoice({ payment_status: 'pending', paid_amount_rappen: 0 })],
    })
    mocks.readBody.mockResolvedValue({ payment_id: PAY_A, tenant_id: TENANT_B })

    const result = await markPaid({}) as { success: boolean; payment_id: string }
    expect(result).toEqual({ success: true, payment_id: PAY_A })

    const storedPayment = db.tables.payments[0]
    expect(storedPayment.payment_status).toBe('completed')
    expect(storedPayment.payment_method).toBe('cash')
    expect(storedPayment.amount_paid_rappen).toBe(0)
    expect(db.tables.invoices[0].payment_status).toBe('paid')
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(0)
    expect(db.writes.filter((write) => write.table === 'invoice_payments')).toHaveLength(0)
    const invoiceWrite = db.writes.find((write) => write.table === 'invoices')
    expect(invoiceWrite?.payload).toMatchObject({ payment_status: 'paid' })
    expect(invoiceWrite?.payload).not.toHaveProperty('paid_amount_rappen')
  })

  it('marks the invoice partial when another same-tenant payment is still open', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [
        payment({ invoice_id: INVOICE_A }),
        payment({ id: PAY_A2, invoice_id: INVOICE_A, payment_status: 'pending' }),
      ],
      invoices: [invoice({})],
    })
    mocks.readBody.mockResolvedValue({ payment_id: PAY_A })

    const result = await markPaid({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(db.tables.payments.find((row) => row.id === PAY_A)?.payment_status).toBe('completed')
    expect(db.tables.payments.find((row) => row.id === PAY_A2)?.payment_status).toBe('pending')
    expect(db.tables.invoices[0].payment_status).toBe('partial')
    expect(db.tables.invoices[0].paid_at).toBeUndefined()
  })

  it('still counts an unset-tenant payment toward partial, and ignores another tenant', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [
        payment({ invoice_id: INVOICE_A }),
        payment({ id: PAY_A2, invoice_id: INVOICE_A, tenant_id: null, payment_status: 'pending' }),
        payment({ id: PAY_B, invoice_id: INVOICE_A, tenant_id: TENANT_B, payment_status: 'pending' }),
      ],
      invoices: [invoice({})],
    })
    mocks.readBody.mockResolvedValue({ payment_id: PAY_A })

    const result = await markPaid({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(db.tables.invoices[0].payment_status).toBe('partial')
    expect(db.tables.payments.find((row) => row.id === PAY_B)?.payment_status).toBe('pending')
    expect(db.tables.payments.find((row) => row.id === PAY_B)?.tenant_id).toBe(TENANT_B)
  })

  it('does not mark a foreign payment or a foreign invoice paid', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [
        payment({ id: PAY_B, tenant_id: TENANT_B, invoice_id: INVOICE_B }),
        payment({ id: PAY_A, invoice_id: INVOICE_B }),
      ],
      invoices: [invoice({ id: INVOICE_B, tenant_id: TENANT_B, billing_company_name: SECRET, invoice_number: FOREIGN_NUMBER })],
    })

    mocks.readBody.mockResolvedValue({ payment_id: PAY_B, tenant_id: TENANT_B })
    const foreignPayment = await rejectionOf(() => markPaid({}))
    expect(foreignPayment.statusCode).toBe(404)
    expect(JSON.stringify(foreignPayment)).not.toContain(SECRET)
    expect(JSON.stringify(foreignPayment)).not.toContain(FOREIGN_NUMBER)
    expect(db.tables.payments.find((row) => row.id === PAY_B)?.payment_status).toBe('pending')
    expect(db.writes.filter((write) => write.op === 'update')).toHaveLength(0)

    mocks.readBody.mockResolvedValue({ payment_id: PAY_A, tenant_id: TENANT_A })
    const foreignInvoice = await rejectionOf(() => markPaid({}))
    expect(foreignInvoice.statusCode).toBe(404)
    expect(db.tables.payments.find((row) => row.id === PAY_A)?.payment_status).toBe('pending')
    expect(db.tables.invoices[0].payment_status).toBe('pending')
    expect(db.writes.filter((write) => write.op === 'update')).toHaveLength(0)
  })

  it('does not leave a completed payment when the settlement RPC fails or returns null (handler mock, not a database transaction)', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [
        payment({ invoice_id: INVOICE_A }),
        payment({ id: PAY_A2, invoice_id: INVOICE_A, payment_status: 'pending' }),
      ],
      invoices: [invoice({ payment_status: 'pending' })],
    }, { rpcError: true })
    mocks.readBody.mockResolvedValue({ payment_id: PAY_A })

    const failed = await rejectionOf(() => markPaid({}))
    expect(failed.statusCode).toBe(500)
    expect(db.tables.payments.find((row) => row.id === PAY_A)?.payment_status).toBe('pending')
    expect(db.tables.payments.find((row) => row.id === PAY_A2)?.payment_status).toBe('pending')
    expect(db.tables.invoices[0].payment_status).toBe('pending')
    expect(db.writes.filter((write) => write.op === 'update')).toHaveLength(0)

    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_A })],
      invoices: [invoice({ payment_status: 'pending' })],
    }, { rpcNull: true })
    mocks.getSupabaseAdmin.mockImplementation(() => db)

    const missing = await rejectionOf(() => markPaid({}))
    expect(missing.statusCode).toBe(500)
    expect(db.tables.payments[0].payment_status).toBe('pending')
    expect(db.tables.invoices[0].payment_status).toBe('pending')
  })

  it('does not book a second cash completion when the payment is already completed', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_A, payment_status: 'completed', payment_method: 'cash', paid_at: '2026-10-01T00:00:00.000Z', amount_paid_rappen: 5000 })],
      invoices: [invoice({ payment_status: 'paid', paid_at: '2026-10-01T00:00:00.000Z' })],
    })
    mocks.readBody.mockResolvedValue({ payment_id: PAY_A })

    const result = await markPaid({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(db.tables.payments[0].paid_at).toBe('2026-10-01T00:00:00.000Z')
    expect(db.tables.payments[0].amount_paid_rappen).toBe(5000)
    expect(db.writes.filter((write) => write.table === 'payments')).toHaveLength(0)
  })

  it('does not return success when the invoice update matches nothing', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_A })],
      invoices: [invoice({})],
    }, { skipUpdates: ['invoices'] })
    mocks.readBody.mockResolvedValue({ payment_id: PAY_A })

    const error = await rejectionOf(() => markPaid({}))
    expect(error.statusCode).toBe(404)
    expect(db.tables.payments[0].payment_status).toBe('pending')
    expect(db.tables.invoices[0].payment_status).toBe('pending')
    expect(db.writes.filter((write) => write.op === 'update')).toHaveLength(0)
  })
})

describe('mark-invoice-paid tenant scope', () => {
  it('preserves partial amount, status, and journal fields for the same tenant', async () => {
    db = createDb({
      users: [staffUser('admin')],
      invoices: [invoice({ paid_amount_rappen: 2000, payment_status: 'partial' })],
      payments: [payment({ invoice_id: INVOICE_A, payment_status: 'pending' })],
    })
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE_A,
      tenant_id: TENANT_B,
      paid_amount_rappen: 3000,
      paid_at: '2026-10-15T12:00:00.000Z',
      note: 'Bar',
      payment_method: 'cash',
    })

    const result = await markInvoicePaid({}) as Row
    expect(result).toMatchObject({
      success: true,
      invoice_id: INVOICE_A,
      paid_amount_rappen: 5000,
      is_partial: true,
      credit_applied_rappen: 0,
    })
    expect(db.tables.invoices[0]).toMatchObject({
      paid_amount_rappen: 5000,
      payment_status: 'partial',
      status: 'sent',
      dunning_level: 2,
      dunning_paused: true,
      internal_notes: 'Bar',
    })
    expect(db.tables.invoice_payments).toEqual([expect.objectContaining({
      invoice_id: INVOICE_A,
      tenant_id: TENANT_A,
      amount_rappen: 3000,
      payment_method: 'cash',
      status: 'completed',
      currency: 'CHF',
    })])
    expect(db.tables.payments[0].payment_status).toBe('pending')
    expect(mocks.applyInvoiceCreditOnPaid).not.toHaveBeenCalled()
    expect(mocks.applyStaffPosCreditsForPaidInvoice).not.toHaveBeenCalled()
  })

  it('still books a full invoice when the supplied amount is 0', async () => {
    db = createDb({
      users: [staffUser('tenant_admin')],
      invoices: [invoice({ user_id: USER_A })],
      payments: [payment({ invoice_id: INVOICE_A, payment_status: 'invoice' })],
      invoice_items: [],
    })
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE_A,
      paid_amount_rappen: 0,
      paid_at: '2026-10-15T12:00:00.000Z',
    })

    const result = await markInvoicePaid({}) as Row
    expect(result).toMatchObject({ success: true, paid_amount_rappen: 10000, is_partial: false })
    expect(db.tables.invoices[0]).toMatchObject({
      paid_amount_rappen: 10000,
      payment_status: 'paid',
      status: 'paid',
      dunning_level: 0,
      dunning_paused: false,
    })
    expect(db.tables.invoice_payments[0].amount_rappen).toBe(10000)
    expect(db.tables.payments[0].payment_status).toBe('completed')
    expect(mocks.applyInvoiceCreditOnPaid).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: INVOICE_A,
      tenantId: TENANT_A,
      userId: USER_A,
    }))
  })

  it('rejects a foreign or unknown invoice before any journal write', async () => {
    db = createDb({
      users: [staffUser('admin')],
      invoices: [invoice({ id: INVOICE_B, tenant_id: TENANT_B, billing_company_name: SECRET, invoice_number: FOREIGN_NUMBER, paid_amount_rappen: 0 })],
    })
    mocks.readBody.mockResolvedValue({ invoice_id: INVOICE_B, tenant_id: TENANT_B, paid_amount_rappen: 1000 })

    const foreign = await rejectionOf(() => markInvoicePaid({}))
    expect(foreign.statusCode).toBe(404)
    expect(JSON.stringify(foreign)).not.toContain(SECRET)
    expect(JSON.stringify(foreign)).not.toContain(FOREIGN_NUMBER)
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(0)
    expect(db.writes).toHaveLength(0)

    mocks.readBody.mockResolvedValue({ invoice_id: UNKNOWN_INVOICE, paid_amount_rappen: 1000 })
    const unknown = await rejectionOf(() => markInvoicePaid({}))
    expect(unknown.statusCode).toBe(404)
    expect(db.writes).toHaveLength(0)
  })

  it('rolls the mocked header back when the journal write fails (handler mock, not a database transaction)', async () => {
    db = createDb({
      users: [staffUser('admin')],
      invoices: [invoice({ paid_amount_rappen: 2000, payment_status: 'partial' })],
      payments: [payment({ invoice_id: INVOICE_A, payment_status: 'pending' })],
    }, { failJournal: true })
    mocks.readBody.mockResolvedValue({ invoice_id: INVOICE_A, paid_amount_rappen: 3000 })

    const error = await rejectionOf(() => markInvoicePaid({}))
    expect(error.statusCode).toBe(500)
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(2000)
    expect(db.tables.invoices[0].payment_status).toBe('partial')
    expect(db.tables.payments[0].payment_status).toBe('pending')
    expect(db.tables.invoice_payments || []).toHaveLength(0)
    expect(mocks.applyInvoiceCreditOnPaid).not.toHaveBeenCalled()
  })

  it('does not return success or insert a journal when the update matches zero rows', async () => {
    db = createDb({
      users: [staffUser('admin')],
      invoices: [invoice({ paid_amount_rappen: 2000 })],
    }, { skipUpdates: ['invoices'] })
    mocks.readBody.mockResolvedValue({ invoice_id: INVOICE_A, paid_amount_rappen: 3000 })

    const error = await rejectionOf(() => markInvoicePaid({}))
    expect(error.statusCode).toBe(404)
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(2000)
    expect(db.writes.filter((write) => write.table === 'invoice_payments')).toHaveLength(0)
  })

  it('does not complete payments from an invoice item owned by another tenant', async () => {
    db = createDb({
      users: [staffUser('admin')],
      invoices: [invoice({ user_id: USER_A, paid_amount_rappen: 0 })],
      invoice_items: [
        { invoice_id: INVOICE_A, tenant_id: TENANT_A, appointment_id: APPT_A },
        { invoice_id: INVOICE_A, tenant_id: null, appointment_id: APPT_NULL },
        { invoice_id: INVOICE_A, tenant_id: TENANT_B, appointment_id: APPT_B },
      ],
      payments: [
        payment({ id: PAY_A, appointment_id: APPT_A, payment_status: 'pending' }),
        payment({ id: PAY_A2, appointment_id: APPT_NULL, payment_status: 'pending' }),
        payment({ id: 'pay-foreign-item', tenant_id: TENANT_A, user_id: USER_A, appointment_id: APPT_B, payment_status: 'pending' }),
        payment({ id: PAY_B, tenant_id: TENANT_B, user_id: USER_A, appointment_id: APPT_A, payment_status: 'pending' }),
      ],
    })
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE_A,
      paid_amount_rappen: 10000,
      paid_at: '2026-10-15T12:00:00.000Z',
    })

    const result = await markInvoicePaid({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(db.tables.payments.find((row) => row.id === PAY_A)?.payment_status).toBe('completed')
    expect(db.tables.payments.find((row) => row.id === PAY_A2)?.payment_status).toBe('completed')
    expect(db.tables.payments.find((row) => row.id === 'pay-foreign-item')?.payment_status).toBe('pending')
    expect(db.tables.payments.find((row) => row.id === PAY_B)?.payment_status).toBe('pending')
  })
})

describe('bulk payment tenant scope', () => {
  it('settles a same-tenant cash batch without writing paid_amount_rappen', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_A, total_amount_rappen: 5000 })],
      invoices: [invoice({ paid_amount_rappen: 0, payment_status: 'pending' })],
    })
    mocks.readBody.mockResolvedValue({ payment_ids: [PAY_A], method: 'cash', tenant_id: TENANT_B })

    const result = await processBulk({}) as { success: boolean; results: Array<{ success: boolean }> }
    expect(result.success).toBe(true)
    expect(result.results).toEqual([expect.objectContaining({ payment_id: PAY_A, success: true, status: 'completed' })])
    expect(db.tables.payments[0]).toMatchObject({
      payment_status: 'completed',
      payment_method: 'cash',
      amount_paid_rappen: 5000,
    })
    expect(db.tables.invoices[0].payment_status).toBe('paid')
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(0)
    const invoiceWrite = db.writes.find((write) => write.table === 'invoices')
    expect(invoiceWrite?.payload).not.toHaveProperty('paid_amount_rappen')
  })

  it('does not book a completed payment again', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_A, payment_status: 'completed', amount_paid_rappen: 5000, total_amount_rappen: 5000 })],
      invoices: [invoice({ payment_status: 'paid', paid_amount_rappen: 0 })],
    })
    mocks.readBody.mockResolvedValue({ payment_ids: [PAY_A], method: 'cash' })

    const result = await processBulk({}) as { success: boolean; results: Array<{ skipped?: boolean }> }
    expect(result.success).toBe(true)
    expect(result.results).toEqual([expect.objectContaining({ payment_id: PAY_A, skipped: true })])
    expect(db.tables.payments[0].amount_paid_rappen).toBe(5000)
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(0)
    expect(db.writes.filter((write) => write.op === 'update')).toHaveLength(0)
  })

  it('confirms a pending appointment on a completed-payment replay without rewriting the payment', async () => {
    const appointmentId = '77777777-7777-4777-8777-777777777777'
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({
        invoice_id: INVOICE_A,
        payment_status: 'completed',
        amount_paid_rappen: 5000,
        total_amount_rappen: 5000,
        appointment_id: appointmentId,
        user_id: null,
      })],
      invoices: [invoice({ payment_status: 'paid', paid_amount_rappen: 0 })],
      appointments: [{ id: appointmentId, tenant_id: TENANT_A, status: 'pending_confirmation' }],
    })
    mocks.readBody.mockResolvedValue({ payment_ids: [PAY_A], method: 'cash' })

    const result = await processBulk({}) as { success: boolean; results: Array<{ skipped?: boolean }> }
    expect(result.results).toEqual([expect.objectContaining({ payment_id: PAY_A, skipped: true })])
    expect(db.tables.payments[0].amount_paid_rappen).toBe(5000)
    expect(db.tables.appointments[0].status).toBe('confirmed')
    expect(db.writes.filter((write) => write.table === 'payments')).toHaveLength(0)
    expect(db.writes.filter((write) => write.table === 'student_credits')).toHaveLength(0)
  })

  it('rejects a foreign payment id before updating anyone', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [
        payment({ id: PAY_A, payment_status: 'pending' }),
        payment({ id: PAY_B, tenant_id: TENANT_B, payment_status: 'pending' }),
      ],
      invoices: [],
    })
    mocks.readBody.mockResolvedValue({ payment_ids: [PAY_A, PAY_B], method: 'cash' })

    const error = await rejectionOf(() => processBulk({}))
    expect(error.statusCode).toBe(404)
    expect(db.tables.payments.every((row) => row.payment_status === 'pending')).toBe(true)
    expect(db.writes.filter((write) => write.op === 'update')).toHaveLength(0)
  })

  it('does not flip another tenant invoice and does not report that sync as success', async () => {
    db = createDb({
      users: [staffUser('admin')],
      payments: [payment({ invoice_id: INVOICE_B, total_amount_rappen: 5000 })],
      invoices: [invoice({
        id: INVOICE_B,
        tenant_id: TENANT_B,
        payment_status: 'pending',
        billing_company_name: SECRET,
        invoice_number: FOREIGN_NUMBER,
      })],
    })
    mocks.readBody.mockResolvedValue({ payment_ids: [PAY_A], method: 'cash' })

    const error = await rejectionOf(() => processBulk({}))
    expect(error.statusCode).toBe(404)
    expect(db.tables.payments[0].payment_status).toBe('pending')
    expect(db.tables.invoices[0].payment_status).toBe('pending')
    expect(db.tables.invoices[0].paid_amount_rappen).toBe(0)
    expect(JSON.stringify(error)).not.toContain(SECRET)
    expect(JSON.stringify(error)).not.toContain(FOREIGN_NUMBER)
  })
})
