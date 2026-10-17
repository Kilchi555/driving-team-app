import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

const allocateMocks = vi.hoisted(() => ({
  allocateInvoiceNumber: vi.fn(async () => 'RE-ORDER-1'),
  allocateQuoteNumber: vi.fn(async () => 'OFF-ORDER-1'),
}))

const creditMocks = vi.hoisted(() => ({
  applyStudentCreditToPayments: vi.fn(async () => ({
    credit_used_rappen: 0,
    fully_covered_payment_ids: [] as string[],
    remaining_payment_ids: [] as string[],
    applied_by_payment_id: {} as Record<string, number>,
  })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: async (event: { body?: unknown }) => event.body,
  }
})

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: (...args: unknown[]) => authMocks.getAuthenticatedUser(...args),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => authMocks.getSupabaseAdmin(),
}))

vi.mock('~/server/utils/allocate-invoice-number', () => ({
  allocateInvoiceNumber: (...args: unknown[]) => allocateMocks.allocateInvoiceNumber(...args),
}))

vi.mock('~/server/utils/allocate-quote-number', () => ({
  allocateQuoteNumber: (...args: unknown[]) => allocateMocks.allocateQuoteNumber(...args),
}))

vi.mock('~/server/utils/apply-student-credit', () => ({
  applyStudentCreditToPayments: (...args: unknown[]) => creditMocks.applyStudentCreditToPayments(...args),
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-4111-8111-111111111111'
const COMPANY = '8d195a31-0fa6-423f-8ef9-e2e893e17e2d'
const FOREIGN = '525bf160-906c-4886-9284-b6e68eb6195c'
const UNKNOWN = '33333333-3333-4333-8333-333333333333'
const STAFF = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PAYMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
type Filter = { type: 'eq' | 'in'; col: string; val: unknown }

function createMemorySupabase(options?: { failSelect?: string[] }) {
  const failSelect = new Set(options?.failSelect || [])
  const tables: Record<string, Row[]> = {
    users: [{
      id: STAFF,
      tenant_id: TENANT,
      auth_user_id: 'auth-admin',
      role: 'admin',
      company_id: COMPANY,
      first_name: 'Ada',
      last_name: 'Admin',
      email: 'ada@example.test',
    }],
    companies: [
      { id: COMPANY, tenant_id: TENANT, name: 'Gewählte GmbH' },
      { id: FOREIGN, tenant_id: OTHER, name: 'Fremde GmbH' },
    ],
    tenants: [{ id: TENANT, default_vat_rate: 0, invoice_due_days: 30 }],
    payments: [{
      id: PAYMENT,
      tenant_id: TENANT,
      user_id: STAFF,
      appointment_id: null,
      total_amount_rappen: 10000,
      payment_status: 'pending',
    }],
    invoices: [],
    invoice_items: [],
    invoices_with_details: [],
  }
  const calls: string[] = []

  function matches(row: Row, filters: Filter[]) {
    return filters.every((filter) => {
      if (filter.type === 'eq') return row[filter.col] === filter.val
      return (filter.val as unknown[]).includes(row[filter.col])
    })
  }

  return {
    tables,
    calls,
    from(table: string) {
      calls.push(table)
      if (!tables[table]) tables[table] = []
      const state: { filters: Filter[]; op: 'select' | 'insert' | 'update'; payload: Row | Row[] | null } = {
        filters: [],
        op: 'select',
        payload: null,
      }
      const execute = () => {
        if (state.op === 'select' && failSelect.has(table)) {
          return { data: null, error: { message: 'select failed' } }
        }
        const rows = tables[table]
        if (state.op === 'insert') {
          const incoming = Array.isArray(state.payload) ? state.payload : [state.payload || {}]
          const stored = incoming.map((row) => ({ id: row.id || crypto.randomUUID(), ...row }))
          rows.push(...stored)
          return { data: stored.map((row) => ({ ...row })), error: null }
        }
        const matched = rows.filter((row) => matches(row, state.filters))
        if (state.op === 'update' && state.payload && !Array.isArray(state.payload)) {
          for (const row of matched) Object.assign(row, state.payload)
        }
        return { data: matched.map((row) => ({ ...row })), error: null }
      }
      const chain = {
        select: () => chain,
        insert: (payload: Row | Row[]) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: Row) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.filters.push({ type: 'eq', col, val }); return chain },
        in: (col: string, val: unknown) => { state.filters.push({ type: 'in', col, val }); return chain },
        is: () => chain,
        neq: () => chain,
        order: () => chain,
        single: async () => {
          const result = execute()
          if (result.error) return result
          return { data: result.data[0] || null, error: result.data[0] ? null : { message: 'missing' } }
        },
        maybeSingle: async () => {
          const result = execute()
          if (result.error) return { data: null, error: result.error }
          return { data: result.data[0] || null, error: null }
        },
        then: (
          onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(execute()).then(onFulfilled, onRejected),
      }
      return chain
    },
  }
}

type MemoryDb = ReturnType<typeof createMemorySupabase>

function invoiceBody(partial: Record<string, unknown> = {}) {
  return {
    invoiceData: {
      user_id: STAFF,
      billing_type: 'company',
      billing_company_name: 'Freitext GmbH',
      billing_email: 'billing@example.test',
      billing_street: 'Weg',
      billing_zip: '3000',
      billing_city: 'Bern',
      invoice_date: '2026-10-16',
      due_date: '2026-11-15',
      vat_rate: 0,
      ...partial,
    },
    items: [{
      product_name: 'Fahrstunde',
      quantity: 1,
      unit_price_rappen: 10000,
      total_price_rappen: 10000,
      vat_amount_rappen: 0,
    }],
    apply_available_credit: false,
  }
}

async function createInvoice(db: MemoryDb, body: ReturnType<typeof invoiceBody>) {
  authMocks.getSupabaseAdmin.mockReturnValue(db)
  const handler = (await import('~/server/api/invoices/create.post')).default as (
    event: unknown,
  ) => Promise<unknown>
  return handler({ body })
}

describe('POST /api/invoices/create company check before side effects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-admin' })
    creditMocks.applyStudentCreditToPayments.mockResolvedValue({
      credit_used_rappen: 100,
      fully_covered_payment_ids: [],
      remaining_payment_ids: [PAYMENT],
      applied_by_payment_id: { [PAYMENT]: 100 },
    })
  })

  async function expectRejected(companyId: unknown, statusCode: number, db = createMemorySupabase()) {
    const body = invoiceBody({ company_id: companyId, document_kind: 'quote' })
    body.apply_available_credit = true
    body.items = [{
      ...body.items[0],
      _open_item_source_table: 'payments',
      _open_item_id: PAYMENT,
    }]
    await expect(createInvoice(db, body)).rejects.toMatchObject({ statusCode })
    expect(allocateMocks.allocateInvoiceNumber).not.toHaveBeenCalled()
    expect(allocateMocks.allocateQuoteNumber).not.toHaveBeenCalled()
    expect(creditMocks.applyStudentCreditToPayments).not.toHaveBeenCalled()
    expect(db.tables.invoices).toHaveLength(0)
    return db
  }

  it('rejects a foreign-tenant company before numbers, credit, and insert', async () => {
    await expectRejected(FOREIGN, 404)
  })

  it('rejects an unknown company before numbers, credit, and insert', async () => {
    await expectRejected(UNKNOWN, 404)
  })

  it('rejects an invalid company UUID before numbers, credit, and insert', async () => {
    const db = await expectRejected('not-a-company', 400)
    expect(db.calls.filter((table) => table === 'companies')).toHaveLength(0)
  })

  it('fails closed when the company lookup errors', async () => {
    await expectRejected(COMPANY, 503, createMemorySupabase({ failSelect: ['companies'] }))
  })

  it('stores a same-tenant company id and still applies credit on a valid invoice', async () => {
    const sequence: string[] = []
    const real = createMemorySupabase()
    const wrapped = createMemorySupabase()
    wrapped.from = ((table: string) => {
      if (table === 'companies') sequence.push('company')
      return real.from(table)
    }) as typeof wrapped.from
    wrapped.tables = real.tables
    wrapped.calls = real.calls

    allocateMocks.allocateInvoiceNumber.mockImplementation(async () => {
      sequence.push('invoice-number')
      return 'RE-ORDER-1'
    })
    creditMocks.applyStudentCreditToPayments.mockImplementation(async () => {
      sequence.push('credit')
      return {
        credit_used_rappen: 100,
        fully_covered_payment_ids: [],
        remaining_payment_ids: [PAYMENT],
        applied_by_payment_id: { [PAYMENT]: 100 },
      }
    })

    const body = invoiceBody({ company_id: COMPANY })
    body.apply_available_credit = true
    body.items = [{
      ...body.items[0],
      _open_item_source_table: 'payments',
      _open_item_id: PAYMENT,
    }]

    const result = await createInvoice(wrapped, body)
    expect(result).toMatchObject({ success: true })
    expect(sequence).toEqual(['company', 'invoice-number', 'credit'])
    expect(real.tables.invoices).toHaveLength(1)
    expect(real.tables.invoices[0]).toMatchObject({
      company_id: COMPANY,
      tenant_id: TENANT,
      invoice_number: 'RE-ORDER-1',
      billing_company_name: 'Freitext GmbH',
    })
    expect(allocateMocks.allocateQuoteNumber).not.toHaveBeenCalled()
  })

  it('leaves an absent company id unlinked', async () => {
    const db = createMemorySupabase()
    const result = await createInvoice(db, invoiceBody({ billing_type: 'individual' }))
    expect(result).toMatchObject({ success: true })
    expect(db.tables.invoices[0]).toMatchObject({ company_id: null, billing_type: 'individual' })
    expect(db.calls.filter((table) => table === 'companies')).toHaveLength(0)
  })

  it('does not infer a company from a billing name or the customer membership', async () => {
    const db = createMemorySupabase()
    const result = await createInvoice(db, invoiceBody({
      billing_type: 'company',
      billing_company_name: 'Freitext GmbH',
    }))
    expect(result).toMatchObject({ success: true })
    expect(db.tables.invoices[0]).toMatchObject({
      company_id: null,
      billing_type: 'company',
      billing_company_name: 'Freitext GmbH',
    })
    expect(db.calls.filter((table) => table === 'companies')).toHaveLength(0)
  })

  it('stores a supplied company id on an individual invoice only when it is in the tenant', async () => {
    const db = createMemorySupabase()
    const result = await createInvoice(db, invoiceBody({
      billing_type: 'individual',
      billing_company_name: '',
      company_id: COMPANY,
    }))
    expect(result).toMatchObject({ success: true })
    expect(db.tables.invoices[0]).toMatchObject({
      billing_type: 'individual',
      company_id: COMPANY,
    })
  })
})
