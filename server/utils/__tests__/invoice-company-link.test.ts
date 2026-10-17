import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InvoiceCompanyLinkError,
  autoInvoiceCompanyId,
  externalResourceInvoiceAssociation,
} from '~/server/utils/invoice-company-link'
import type { InvoiceDraftPayload, PersistAndSendActor } from '~/server/utils/invoice-persist-and-send'
import { allocateInvoiceNumber } from '~/server/utils/allocate-invoice-number'

vi.mock('~/server/utils/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'mail-1' })) }))
vi.mock('~/server/utils/invoice-pdf', () => ({
  generateInvoicePdf: vi.fn(async () => Buffer.from('pdf')),
  formatTenantContactPerson: () => 'Ada Admin',
}))
vi.mock('~/server/utils/tenant-logo-for-pdf', () => ({
  loadTenantLogoForPdf: vi.fn(async () => null),
  resolveTenantWideLogoUrl: () => null,
}))
vi.mock('~/server/utils/invoice-email', () => ({ buildInvoiceEmailHtml: () => '<p>invoice</p>' }))
vi.mock('~/server/utils/tenant-terminology', () => ({
  getTenantTerminology: vi.fn(async () => ({ appointment: 'Termin', client: 'Kunde' })),
  appointmentCountLabel: () => '1 Termin',
}))
vi.mock('~/server/utils/allocate-invoice-number', () => ({
  allocateInvoiceNumber: vi.fn(async () => 'RE-TEST-1'),
}))

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
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

const creditMocks = vi.hoisted(() => ({
  applyStudentCreditToPayments: vi.fn(async () => ({
    credit_used_rappen: 0,
    credit_remaining_rappen: 0,
    allocations: [],
    fully_covered_payment_ids: [],
    remaining_payment_ids: [],
    applied_by_payment_id: {},
  })),
}))

vi.mock('~/server/utils/apply-student-credit', () => ({
  applyStudentCreditToPayments: (...args: unknown[]) => creditMocks.applyStudentCreditToPayments(...args),
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-4111-8111-111111111111'
const COMPANY = '8d195a31-0fa6-423f-8ef9-e2e893e17e2d'
const FOREIGN = '525bf160-906c-4886-9284-b6e68eb6195c'
const UNKNOWN = '33333333-3333-4333-8333-333333333333'
const EXISTING_INVOICE = '9364490e-7c25-4f4a-a5d6-35b3299fff86'

type Row = Record<string, unknown>
type Filter = { type: 'eq' | 'in' | 'is'; col: string; val: unknown }

function createMemorySupabase(tables: Record<string, Row[]>, options?: {
  failInsert?: string[]
  failSelect?: string[]
  forbid?: string[]
}) {
  const failInsert = new Set(options?.failInsert || [])
  const failSelect = new Set(options?.failSelect || [])
  const forbid = new Set(options?.forbid || [])
  const calls: string[] = []

  function matches(row: Row, filters: Filter[]) {
    return filters.every((filter) => {
      if (filter.type === 'eq') return row[filter.col] === filter.val
      if (filter.type === 'in') return (filter.val as unknown[]).includes(row[filter.col])
      if (filter.type === 'is') return filter.val == null ? row[filter.col] == null : row[filter.col] === filter.val
      return false
    })
  }

  return {
    tables,
    calls,
    from(table: string) {
      calls.push(table)
      if (forbid.has(table)) throw new Error(`forbidden table ${table}`)
      if (!tables[table]) tables[table] = []
      const state: { filters: Filter[]; op: 'select' | 'insert' | 'update' | 'delete'; payload: Row | Row[] | null } = {
        filters: [],
        op: 'select',
        payload: null,
      }
      const execute = () => {
        if (state.op === 'select' && failSelect.has(table)) {
          return { data: null, error: { message: 'select failed' } }
        }
        if (state.op === 'insert' && failInsert.has(table)) {
          return { data: null, error: { message: 'insert failed' } }
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
        delete: () => { state.op = 'delete'; return chain },
        eq: (col: string, val: unknown) => { state.filters.push({ type: 'eq', col, val }); return chain },
        in: (col: string, val: unknown) => { state.filters.push({ type: 'in', col, val }); return chain },
        is: (col: string, val: unknown) => { state.filters.push({ type: 'is', col, val }); return chain },
        neq: () => chain,
        order: () => chain,
        limit: () => chain,
        single: async () => {
          const result = execute()
          if (result.error) return result
          const row = result.data[0]
          if (!row) return { data: null, error: { message: 'missing' } }
          return { data: row, error: null }
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

function asClient(db: MemoryDb): SupabaseClient {
  return db as unknown as SupabaseClient
}

const actor: PersistAndSendActor = { id: 'staff-1', first_name: 'Ada', last_name: 'Admin', email: 'ada@example.test' }

function baseTables(): Record<string, Row[]> {
  return {
    tenants: [{ id: TENANT, name: 'Fahrschule', contact_email: 'office@example.test' }],
    companies: [
      { id: COMPANY, tenant_id: TENANT, name: 'Gewählte GmbH' },
      { id: FOREIGN, tenant_id: OTHER, name: 'Fremde GmbH' },
    ],
    users: [{
      id: 'user-1',
      tenant_id: TENANT,
      auth_user_id: 'auth-admin',
      role: 'admin',
      company_id: COMPANY,
      first_name: 'Ada',
      last_name: 'Admin',
      email: 'ada@example.test',
    }],
    invoices: [{
      id: EXISTING_INVOICE,
      tenant_id: TENANT,
      company_id: null,
      billing_type: 'company',
      billing_company_name: 'Bestehend',
      total_amount_rappen: 18600,
      payment_status: 'pending',
      status: 'sent',
    }],
    payments: [{
      id: 'pay-existing',
      tenant_id: TENANT,
      invoice_id: EXISTING_INVOICE,
      total_amount_rappen: 18600,
      payment_status: 'pending',
      payment_method: 'invoice',
    }],
    invoice_items: [],
    company_billing_addresses: [],
  }
}

function draft(partial: Partial<InvoiceDraftPayload> = {}): InvoiceDraftPayload {
  return {
    user_id: 'user-1',
    tenant_id: TENANT,
    invoice_date: '2026-10-16',
    due_date: '2026-11-15',
    billing_type: 'company',
    billing_company_name: 'Freitext GmbH',
    billing_email: 'billing@example.test',
    billing_first_name: 'Ada',
    billing_last_name: 'Kontakt',
    billing_street: 'Weg',
    billing_street_nr: '1',
    billing_zip: '3000',
    billing_city: 'Bern',
    subtotal_rappen: 10000,
    vat_rate: 0,
    vat_amount_rappen: 0,
    total_amount_rappen: 10000,
    items: [{ product_name: 'Fahrstunde', quantity: 1, unit_price_rappen: 10000, total_price_rappen: 10000 }],
    ...partial,
  }
}

async function persist(db: MemoryDb, partial: Partial<InvoiceDraftPayload> = {}) {
  const { persistAndSendInvoiceDraft } = await import('~/server/utils/invoice-persist-and-send')
  return persistAndSendInvoiceDraft({
    supabase: asClient(db),
    tenantId: TENANT,
    actor,
    draft: draft(partial),
    sendEmailFlag: false,
  })
}

function newInvoice(db: MemoryDb) {
  return db.tables.invoices.find((row) => row.id !== EXISTING_INVOICE)
}

describe('future invoice company links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores an explicit company id from the same tenant', async () => {
    const db = createMemorySupabase(baseTables())
    await persist(db, { company_id: COMPANY, billing_company_name: 'Freitext GmbH' })
    expect(newInvoice(db)).toMatchObject({
      company_id: COMPANY,
      billing_type: 'company',
      billing_company_name: 'Freitext GmbH',
      total_amount_rappen: 10000,
      payment_status: 'pending',
    })
  })

  it('rejects a non-uuid company id before any insert', async () => {
    const db = createMemorySupabase(baseTables(), { forbid: ['companies'] })
    await expect(persist(db, { company_id: 'not-a-company' })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Ungültige Firmen-ID',
    })
    expect(db.tables.invoices).toHaveLength(1)
  })

  it('rejects a company from another tenant and an unknown company before insert', async () => {
    const foreign = createMemorySupabase(baseTables())
    await expect(persist(foreign, { company_id: FOREIGN })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Firma nicht gefunden',
    })
    expect(foreign.tables.invoices).toHaveLength(1)

    const unknown = createMemorySupabase(baseTables())
    await expect(persist(unknown, { company_id: UNKNOWN })).rejects.toBeInstanceOf(InvoiceCompanyLinkError)
    expect(unknown.tables.invoices).toHaveLength(1)
  })

  it('leaves a company name without an id unlinked and does not read membership', async () => {
    const db = createMemorySupabase(baseTables(), { forbid: ['users'] })
    await persist(db, { billing_type: 'company', billing_company_name: 'Freitext GmbH' })
    expect(newInvoice(db)?.company_id).toBeNull()
    expect(newInvoice(db)?.billing_company_name).toBe('Freitext GmbH')
    expect(db.calls).not.toContain('companies')
    expect(autoInvoiceCompanyId()).toBeNull()
  })

  it('does not copy the customer company onto a personal invoice', async () => {
    const db = createMemorySupabase(baseTables(), { forbid: ['companies'] })
    await persist(db, { billing_type: 'individual', company_id: COMPANY, billing_company_name: '' })
    expect(newInvoice(db)).toMatchObject({ billing_type: 'individual', company_id: null })
  })

  it('keeps an existing invoice and its payment amounts unchanged', async () => {
    const db = createMemorySupabase(baseTables())
    const beforeInvoice = { ...db.tables.invoices[0] }
    const beforePayment = { ...db.tables.payments[0] }
    await persist(db, { company_id: COMPANY })
    expect(db.tables.invoices.find((row) => row.id === EXISTING_INVOICE)).toEqual(beforeInvoice)
    expect(db.tables.payments[0]).toEqual(beforePayment)
  })

  it('reports a company lookup failure and an insert failure without a new invoice', async () => {
    const lookup = createMemorySupabase(baseTables(), { failSelect: ['companies'] })
    await expect(persist(lookup, { company_id: COMPANY })).rejects.toMatchObject({
      statusCode: 503,
      message: 'Firma konnte nicht geprüft werden',
    })
    expect(lookup.tables.invoices).toHaveLength(1)

    const insert = createMemorySupabase(baseTables(), { failInsert: ['invoices'] })
    await expect(persist(insert, { company_id: COMPANY })).rejects.toThrow('insert failed')
    expect(insert.tables.invoices).toHaveLength(1)
  })

  it('keeps an external resource free-text recipient unlinked', () => {
    expect(externalResourceInvoiceAssociation({
      externalCompanyName: 'Freitext GmbH',
      suppliedCompanyId: COMPANY,
    })).toEqual({ billing_type: 'company', company_id: null })
    expect(externalResourceInvoiceAssociation({ externalCompanyName: '' })).toEqual({
      billing_type: 'individual',
      company_id: null,
    })
    const source = readFileSync(resolve(process.cwd(), 'server/api/admin/resources/block.post.ts'), 'utf8')
    expect(source).toContain('company_id: resourceInvoiceLink.company_id')
    expect(source).not.toContain('users.company_id')
  })

  it('does not let auto-invoice derive a company id from the billing name or membership', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/utils/auto-invoice-on-complete.ts'), 'utf8')
    expect(source).toContain('company_id: autoInvoiceCompanyId()')
    expect(source).not.toContain('company_id: student.company_id')
    expect(source).not.toContain('company_id: savedBilling')
    const callers = [
      'server/api/staff/save-criteria-evaluations.post.ts',
      'server/api/staff/batch-update-appointment-status.post.ts',
      'server/api/exams/save-result.post.ts',
      'server/api/cron/auto-invoice-scheduled.get.ts',
    ]
    for (const caller of callers) {
      const text = readFileSync(resolve(process.cwd(), caller), 'utf8')
      expect(text).not.toContain('company_id')
    }
  })
})

describe('POST /api/invoices/send-draft company id errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-admin' })
  })

  async function send(db: MemoryDb, companyId: string) {
    authMocks.getSupabaseAdmin.mockReturnValue(db)
    const handler = (await import('~/server/api/invoices/send-draft.post')).default as (
      event: unknown,
    ) => Promise<unknown>
    return handler({ body: { draft: draft({ company_id: companyId }), send_email: false } })
  }

  it('reports a foreign company as not found and does not insert', async () => {
    const db = createMemorySupabase(baseTables())
    await expect(send(db, FOREIGN)).rejects.toMatchObject({ statusCode: 404, message: 'Firma nicht gefunden' })
    expect(db.tables.invoices).toHaveLength(1)
  })

  it('reports an invoice insert failure from the persist step', async () => {
    const db = createMemorySupabase(baseTables(), { failInsert: ['invoices'] })
    await expect(send(db, COMPANY)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'insert failed',
    })
    expect(db.tables.invoices).toHaveLength(1)
  })
})

describe('POST /api/invoices/send-draft credit waits for the company check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-admin' })
  })

  function openPaymentDb(options?: { failSelect?: string[]; forbid?: string[] }) {
    const tables = baseTables()
    tables.payments.push({
      id: 'pay-open',
      tenant_id: TENANT,
      user_id: 'user-1',
      invoice_id: null,
      total_amount_rappen: 10000,
      payment_status: 'pending',
      payment_method: 'invoice',
    })
    return createMemorySupabase(tables, options)
  }

  async function send(db: MemoryDb, partial: Partial<InvoiceDraftPayload>) {
    authMocks.getSupabaseAdmin.mockReturnValue(db)
    const handler = (await import('~/server/api/invoices/send-draft.post')).default as (
      event: unknown,
    ) => Promise<unknown>
    return handler({
      body: {
        draft: draft({ payment_ids: ['pay-open'], ...partial }),
        send_email: false,
        apply_available_credit: true,
      },
    })
  }

  function expectNoCreditOrInvoice(db: MemoryDb) {
    expect(creditMocks.applyStudentCreditToPayments).not.toHaveBeenCalled()
    expect(allocateInvoiceNumber).not.toHaveBeenCalled()
    expect(db.calls).not.toContain('payments')
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.payments.find((row) => row.id === 'pay-open')?.invoice_id).toBeNull()
  }

  it('rejects an invalid company id before credit, claims, or an invoice number', async () => {
    const db = openPaymentDb({ forbid: ['companies'] })
    await expect(send(db, { company_id: 'not-a-company' })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Ungültige Firmen-ID',
    })
    expectNoCreditOrInvoice(db)
  })

  it('rejects a foreign-tenant company id before credit or insert', async () => {
    const db = openPaymentDb()
    await expect(send(db, { company_id: FOREIGN })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Firma nicht gefunden',
    })
    expectNoCreditOrInvoice(db)
  })

  it('rejects an unknown company id before credit or insert', async () => {
    const db = openPaymentDb()
    await expect(send(db, { company_id: UNKNOWN })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Firma nicht gefunden',
    })
    expectNoCreditOrInvoice(db)
  })

  it('rejects a company lookup failure before credit or insert', async () => {
    const db = openPaymentDb({ failSelect: ['companies'] })
    await expect(send(db, { company_id: COMPANY })).rejects.toMatchObject({
      statusCode: 503,
      message: 'Firma konnte nicht geprüft werden',
    })
    expectNoCreditOrInvoice(db)
  })

  it('stores a same-tenant company id and still applies credit on a valid request', async () => {
    const db = openPaymentDb()
    await send(db, { company_id: COMPANY, billing_company_name: 'Freitext GmbH' })
    expect(creditMocks.applyStudentCreditToPayments).toHaveBeenCalledOnce()
    expect(allocateInvoiceNumber).toHaveBeenCalledOnce()
    expect(db.calls.filter((table) => table === 'companies')).toHaveLength(1)
    expect(newInvoice(db)).toMatchObject({
      company_id: COMPANY,
      billing_company_name: 'Freitext GmbH',
      total_amount_rappen: 10000,
    })
    expect(db.tables.payments.find((row) => row.id === 'pay-open')?.invoice_id).toBe(newInvoice(db)?.id)
  })

  it('keeps a company name without an id unlinked and still applies credit', async () => {
    const db = openPaymentDb({ forbid: ['companies'] })
    await send(db, { billing_type: 'company', billing_company_name: 'Freitext GmbH' })
    expect(creditMocks.applyStudentCreditToPayments).toHaveBeenCalledOnce()
    expect(newInvoice(db)).toMatchObject({
      billing_type: 'company',
      billing_company_name: 'Freitext GmbH',
      company_id: null,
    })
  })

  it('keeps a personal invoice unlinked when credit is applied', async () => {
    const db = openPaymentDb({ forbid: ['companies'] })
    await send(db, { billing_type: 'individual', company_id: COMPANY, billing_company_name: '' })
    expect(creditMocks.applyStudentCreditToPayments).toHaveBeenCalledOnce()
    expect(newInvoice(db)).toMatchObject({ billing_type: 'individual', company_id: null })
  })
})

describe('invoice company link error shape', () => {
  it('uses createError status codes for invalid ids', () => {
    expect(new InvoiceCompanyLinkError(400, 'Ungültige Firmen-ID').statusCode).toBe(400)
    const http = createError({ statusCode: 400, statusMessage: 'Ungültige Firmen-ID', message: 'Ungültige Firmen-ID' })
    expect(http.statusCode).toBe(400)
  })
})
