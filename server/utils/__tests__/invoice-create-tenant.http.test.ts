import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return { ...actual, defineEventHandler: (fn: (event: unknown) => unknown) => fn, readBody: mocks.readBody }
})

vi.mock('~/server/utils/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))
vi.mock('~/server/utils/auth', () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))
vi.mock('~/server/utils/allocate-invoice-number', () => ({ allocateInvoiceNumber: async () => 'RE-100' }))
vi.mock('~/server/utils/allocate-quote-number', () => ({ allocateQuoteNumber: async () => 'AN-100' }))
vi.mock('~/server/utils/invoice-due-date', () => ({
  computeInvoiceDueDate: () => '2026-10-25',
  getTenantInvoiceDueDays: async () => 30,
}))
vi.mock('~/server/utils/invoice-vat', () => ({ getTenantDefaultVatRate: async () => 0 }))
vi.mock('~/server/utils/invoice-billing-snapshot', () => ({
  applyMissingInvoiceBilling: async (_sb: unknown, _tenant: string, data: Record<string, unknown>) => data,
}))
vi.mock('~/server/utils/apply-student-credit', () => ({
  applyStudentCreditToPayments: async () => ({
    credit_used_rappen: 0,
    fully_covered_payment_ids: [],
    remaining_payment_ids: [],
    applied_by_payment_id: {},
  }),
}))
vi.mock('~/server/utils/invoice-credit', () => ({ resolveInvoiceLineCreditRappen: () => 0 }))
vi.mock('~/utils/billing-address-map', () => ({ snapshotBillingCompanyName: (name: string) => name || null }))

const TENANT = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const STAFF = '33333333-3333-4333-8333-333333333333'
const STUDENT = '44444444-4444-4444-8444-444444444444'
const OTHER_STUDENT = '55555555-5555-4555-8555-555555555555'
const APT = '66666666-6666-4666-8666-666666666666'
const FOREIGN_APT = '77777777-7777-4777-8777-777777777777'
const PAY = '88888888-8888-4888-8888-888888888888'
const FOREIGN_PAY = '99999999-9999-4999-8999-999999999999'

type Row = Record<string, unknown>

function createDb(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]),
  )
  const inserts: Record<string, Row[]> = {}

  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = []
    let pending: Row | Row[] | null = null
    const matched = () => (tables[table] || []).filter((row) => filters.every((fn) => fn(row)))
    const chain: {
      select: () => typeof chain
      eq: (col: string, val: unknown) => typeof chain
      in: (col: string, vals: unknown[]) => typeof chain
      is: () => typeof chain
      neq: () => typeof chain
      order: () => typeof chain
      insert: (payload: Row | Row[]) => typeof chain
      update: () => typeof chain
      maybeSingle: () => Promise<{ data: Row | null, error: null }>
      single: () => Promise<{ data: Row | null, error: { message: string } | null }>
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
    } = {
      select: () => chain,
      eq(col: string, val: unknown) {
        filters.push((row) => row[col] === val)
        return chain
      },
      in(col: string, vals: unknown[]) {
        filters.push((row) => vals.includes(row[col]))
        return chain
      },
      is() { return chain },
      neq() { return chain },
      order() { return chain },
      insert(payload: Row | Row[]) {
        const list = (Array.isArray(payload) ? payload : [payload]).map((row, index) => ({
          id: row.id || `${table}-${inserts[table]?.length || 0}-${index}`,
          ...row,
        }))
        tables[table] = [...(tables[table] || []), ...list]
        inserts[table] = [...(inserts[table] || []), ...list]
        if (table === 'invoices') tables.invoices_with_details = [...(tables.invoices_with_details || []), ...list]
        pending = Array.isArray(payload) ? list : list[0]
        return chain
      },
      update() { return chain },
      maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
      single: async () => {
        const data = (pending && !Array.isArray(pending) ? pending : matched()[0]) || null
        return { data, error: data ? null : { message: 'missing' } }
      },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        const data = pending && filters.length === 0 ? pending : matched()
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      },
    }
    return chain
  }

  return { from, inserts, tables }
}

const baseUsers = [
  { id: STAFF, auth_user_id: 'auth-staff', tenant_id: TENANT, role: 'admin' },
  { id: STUDENT, tenant_id: TENANT, role: 'client', first_name: 'Max', last_name: 'Muster' },
  { id: OTHER_STUDENT, tenant_id: OTHER, role: 'client', first_name: 'Fremd', last_name: 'Person' },
]

function invoiceBody(overrides: { invoiceData?: Row, items?: Row[] } = {}) {
  return {
    invoiceData: {
      user_id: STUDENT,
      billing_type: 'individual',
      ...overrides.invoiceData,
    },
    items: overrides.items || [{
      product_name: 'Fahrstunde',
      appointment_id: APT,
      quantity: 1,
      unit_price_rappen: 9000,
      total_price_rappen: 9000,
      vat_rate: 0,
      vat_amount_rappen: 0,
    }],
  }
}

async function handler() {
  return (await import('../../api/invoices/create.post')).default as (event: unknown) => Promise<{ success: boolean }>
}

describe('POST /api/invoices/create tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-staff' })
  })

  function useDb(extra: Record<string, Row[]> = {}) {
    const db = createDb({
      users: baseUsers,
      companies: [{ id: 'company-a', tenant_id: TENANT }, { id: 'company-b', tenant_id: OTHER }],
      appointments: [
        { id: APT, tenant_id: TENANT, user_id: STUDENT, event_type_code: 'theory', title: 'Theorieunterricht' },
        { id: FOREIGN_APT, tenant_id: OTHER, user_id: OTHER_STUDENT, event_type_code: 'lesson', title: 'Fremd' },
      ],
      payments: [
        { id: PAY, tenant_id: TENANT, user_id: STUDENT, appointment_id: APT },
        { id: FOREIGN_PAY, tenant_id: OTHER, user_id: OTHER_STUDENT, appointment_id: FOREIGN_APT },
      ],
      event_types: [
        { tenant_id: TENANT, code: 'theory', name: 'Theorie' },
        { tenant_id: TENANT, code: 'lesson', name: 'Fahrstunde' },
        { tenant_id: TENANT, code: 'exam', name: 'Prüfung' },
      ],
      invoices: [],
      invoice_items: [],
      ...extra,
    })
    mocks.getSupabaseAdmin.mockReturnValue(db)
    return db
  }

  it('rejects a foreign appointment id', async () => {
    useDb()
    mocks.readBody.mockResolvedValue(invoiceBody({
      items: [{ product_name: 'X', appointment_id: FOREIGN_APT, quantity: 1, unit_price_rappen: 100, total_price_rappen: 100, vat_rate: 0, vat_amount_rappen: 0 }],
    }))
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a foreign payment id', async () => {
    useDb()
    mocks.readBody.mockResolvedValue(invoiceBody({
      items: [{ product_name: 'X', payment_id: FOREIGN_PAY, quantity: 1, unit_price_rappen: 100, total_price_rappen: 100, vat_rate: 0, vat_amount_rappen: 0 }],
    }))
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a foreign user id and a client tenant id', async () => {
    useDb()
    mocks.readBody.mockResolvedValue(invoiceBody({ invoiceData: { user_id: OTHER_STUDENT } }))
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })

    mocks.readBody.mockResolvedValue(invoiceBody({ invoiceData: { user_id: STUDENT, tenant_id: OTHER } }))
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a foreign company id', async () => {
    useDb()
    mocks.readBody.mockResolvedValue(invoiceBody({
      invoiceData: { user_id: '', company_id: 'company-b', billing_type: 'company' },
    }))
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
  })

  it('stores the tenant event type and student, ignoring client snapshot fields', async () => {
    const db = useDb()
    mocks.readBody.mockResolvedValue(invoiceBody({
      items: [{
        product_name: 'Theorieunterricht',
        appointment_id: APT,
        tenant_id: OTHER,
        user_id: OTHER_STUDENT,
        event_type_code: 'lesson',
        quantity: 1,
        unit_price_rappen: 8500,
        total_price_rappen: 8500,
        vat_rate: 0,
        vat_amount_rappen: 0,
      }],
    }))
    const result = await handler().then((fn) => fn({}))
    expect(result.success).toBe(true)
    const [line] = db.inserts.invoice_items
    expect(line.product_name).toBe('Theorie')
    expect(line.event_type_code).toBe('theory')
    expect(line.user_id).toBe(STUDENT)
    expect(line.tenant_id).toBe(TENANT)
    expect(line.unit_price_rappen).toBe(8500)
    expect(line.total_price_rappen).toBe(8500)
  })

  it('stores Leistung when the appointment event type has no tenant name', async () => {
    const db = useDb({
      appointments: [
        { id: APT, tenant_id: TENANT, user_id: STUDENT, event_type_code: 'workshop', title: 'Fahrstunde' },
      ],
    })
    mocks.readBody.mockResolvedValue(invoiceBody())
    await handler().then((fn) => fn({}))
    expect(db.inserts.invoice_items[0].product_name).toBe('Leistung')
    expect(db.inserts.invoice_items[0].event_type_code).toBe('workshop')
  })
})
