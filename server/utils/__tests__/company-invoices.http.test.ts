import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMPANY_INVOICE_LOAD_ERROR,
  applyCompanyInvoiceResult,
  companyInvoiceLoadErrorMessage,
  companyInvoicesPath,
  startCompanyInvoiceRequest,
} from '~/utils/company-invoice-load'

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  requireAdminProfile: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  requireAdminProfile: (...args: unknown[]) => mocks.requireAdminProfile(...args),
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-4111-8111-111111111111'
const COMPANY = '8d195a31-0fa6-423f-8ef9-e2e893e17e2d'
const OTHER_COMPANY = '22222222-2222-4222-8222-222222222222'
const SAME_TENANT_OTHER_COMPANY = '44444444-4444-4444-8444-444444444444'
const UNKNOWN_COMPANY = '33333333-3333-4333-8333-333333333333'

type Row = Record<string, unknown>
type Filter = { column: string; value: unknown }
type QueryCall = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  select: string | null
  filters: Filter[]
  order: { column: string; ascending: boolean } | null
  limit: number | null
}

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function roleListFrom(source: string, label: string): string[] {
  const match = source.match(/requireAdminProfile\(event,\s*(\[[^\]]+\])\s*\)/)
  if (!match) throw new Error(`${label} role list not found`)
  return JSON.parse(match[1].replace(/'/g, '"'))
}

const endpointRoles = roleListFrom(
  read('server/api/admin/companies/[company_id]/invoices.get.ts'),
  'company invoices',
)

function session(role: string | null, extras: Record<string, unknown> = {}) {
  if (role === null) return null
  return {
    id: `auth-${role}`,
    role,
    tenant_id: TENANT,
    db_user_id: `${role}-1`,
    is_active: true,
    email: `${role}@example.test`,
    ...extras,
  }
}

function invoice(partial: Row): Row {
  return {
    id: 'inv-direct',
    tenant_id: TENANT,
    company_id: COMPANY,
    user_id: 'user-1',
    billing_type: 'company',
    billing_company_name: 'Amsler-Weackerling GmbH',
    billing_email: 'billing@example.test',
    document_kind: 'invoice',
    invoice_number: 'RE-1',
    invoice_date: '2026-09-01',
    status: 'sent',
    payment_status: 'pending',
    total_amount_rappen: 12500,
    created_at: '2026-09-01T00:00:00.000Z',
    ...partial,
  }
}

function freshDb() {
  return {
    companies: [
      { id: COMPANY, tenant_id: TENANT, name: 'Amsler-Weackerling GmbH' },
      { id: OTHER_COMPANY, tenant_id: OTHER, name: 'Fremde GmbH' },
      { id: SAME_TENANT_OTHER_COMPANY, tenant_id: TENANT, name: 'Andere GmbH' },
    ] as Row[],
    invoices: [
      invoice({ id: 'inv-new', invoice_number: 'RE-NEW', created_at: '2026-09-28T00:00:00.000Z' }),
      invoice({ id: 'inv-old', invoice_number: 'RE-OLD', created_at: '2026-08-19T00:00:00.000Z' }),
      invoice({ id: 'inv-quote', document_kind: 'quote', invoice_number: 'OF-1' }),
      invoice({ id: 'inv-other-company', company_id: SAME_TENANT_OTHER_COMPANY, invoice_number: 'RE-OTHER' }),
      invoice({ id: 'inv-other-tenant', tenant_id: OTHER, company_id: COMPANY, invoice_number: 'RE-FOREIGN' }),
      invoice({ id: 'inv-name-only', company_id: null, invoice_number: 'RE-NAME' }),
      invoice({
        id: 'inv-employee',
        company_id: null,
        user_id: 'employee-1',
        billing_type: 'company',
        invoice_number: 'RE-EMP',
      }),
    ] as Row[],
    companyError: null as { message: string; code?: string } | null,
    invoiceError: null as { message: string; code?: string } | null,
    countOverride: null as number | null,
    calls: [] as QueryCall[],
    mutations: [] as QueryCall[],
  }
}

let db = freshDb()

function matches(row: Row, filters: Filter[]) {
  return filters.every((filter) => row[filter.column] === filter.value)
}

function project(row: Row, select: string | null) {
  if (!select || select.trim() === '*') return { ...row }
  const projected: Row = {}
  for (const column of select.split(',').map((part) => part.trim()).filter(Boolean)) {
    projected[column] = row[column]
  }
  return projected
}

function query(table: string) {
  const state: QueryCall = {
    table,
    op: 'select',
    select: null,
    filters: [],
    order: null,
    limit: null,
  }
  const execute = () => {
    db.calls.push({ ...state, filters: [...state.filters] })
    if (state.op !== 'select') {
      db.mutations.push({ ...state, filters: [...state.filters] })
      return { data: null, error: { message: 'unexpected mutation' }, count: null }
    }
    if (table === 'companies') {
      if (db.companyError) return { data: null, error: db.companyError, count: null }
      const row = db.companies.find((item) => matches(item, state.filters)) || null
      return { data: row ? project(row, state.select) : null, error: null, count: null }
    }
    if (table !== 'invoices_with_details') {
      return { data: null, error: { message: `unexpected table ${table}` }, count: null }
    }
    if (db.invoiceError) return { data: null, error: db.invoiceError, count: null }
    let rows = db.invoices.filter((item) => matches(item, state.filters))
    if (state.order) {
      const { column, ascending } = state.order
      rows = [...rows].sort((left, right) => {
        const compared = String(left[column] ?? '').localeCompare(String(right[column] ?? ''))
        return ascending ? compared : -compared
      })
    }
    const count = db.countOverride ?? rows.length
    if (state.limit != null) rows = rows.slice(0, state.limit)
    return { data: rows.map((row) => project(row, state.select)), error: null, count }
  }
  const chain = {
    select(columns: string) {
      state.select = columns
      return chain
    },
    insert(payload: Row) {
      state.op = 'insert'
      db.mutations.push({ ...state, filters: [{ column: 'payload', value: payload }] })
      return chain
    },
    update(payload: Row) {
      state.op = 'update'
      db.mutations.push({ ...state, filters: [{ column: 'payload', value: payload }] })
      return chain
    },
    delete() {
      state.op = 'delete'
      db.mutations.push({ ...state, filters: [] })
      return chain
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value })
      return chain
    },
    order(column: string, options?: { ascending?: boolean }) {
      state.order = { column, ascending: options?.ascending !== false }
      return chain
    },
    limit(value: number) {
      state.limit = value
      return chain
    },
    maybeSingle: async () => {
      const result = execute()
      return { data: result.data, error: result.error }
    },
    then: (
      onFulfilled: (value: { data: unknown; error: unknown; count: number | null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(execute()).then(onFulfilled, onRejected),
  }
  return chain
}

function requestEvent(companyId: string) {
  const url = `/api/admin/companies/${companyId}/invoices?tenant_id=${OTHER}`
  return {
    context: { params: { company_id: companyId } },
    path: url,
    node: { req: { url } },
  }
}

async function getInvoices(companyId: string) {
  const handler = (await import('~/server/api/admin/companies/[company_id]/invoices.get')).default as (
    event: unknown,
  ) => Promise<{ invoices: Row[] }>
  return handler(requestEvent(companyId))
}

describe('GET /api/admin/companies/:company_id/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db = freshDb()
    mocks.getAuthenticatedUser.mockResolvedValue(session('admin'))
    mocks.requireAdminProfile.mockImplementation(async (event: unknown) => {
      const authUser = await mocks.getAuthenticatedUser(event)
      if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
      const role = String(authUser.role || '')
      const tenantId = String(authUser.tenant_id || '')
      const dbUserId = String(authUser.db_user_id || '')
      if (authUser.deleted_at || authUser.is_active === false) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – inactive account' })
      }
      if (!endpointRoles.includes(role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – insufficient role' })
      }
      if (!tenantId || !dbUserId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – no tenant assigned' })
      }
      return { id: dbUserId, tenant_id: tenantId, role, email: authUser.email || '', auth_user_id: authUser.id }
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from: query })
  })

  it('uses the same admin roles as the companies API and never reads a client tenant id', () => {
    const source = read('server/api/admin/companies/[company_id]/invoices.get.ts')
    expect(endpointRoles).toEqual(roleListFrom(read('server/api/admin/companies.ts'), 'companies'))
    expect(endpointRoles).toEqual(['admin', 'staff', 'super_admin', 'superadmin'])
    expect(source).not.toContain('getQuery')
    expect(source.match(/\.eq\('tenant_id', profile\.tenant_id\)/g)).toHaveLength(2)
    expect(source).toContain(".eq('company_id', company.id)")
    expect(source).toContain(".eq('document_kind', 'invoice')")
    expect(source).not.toContain('.insert(')
    expect(source).not.toContain('.update(')
    expect(source).not.toContain('.delete(')
  })

  it('returns directly linked invoices for the authenticated tenant in { invoices }', async () => {
    const before = structuredClone(db.invoices)
    const result = await getInvoices(COMPANY)
    expect(result).toEqual({
      invoices: [
        {
          id: 'inv-new',
          invoice_number: 'RE-NEW',
          invoice_date: '2026-09-01',
          total_amount_rappen: 12500,
          payment_status: 'pending',
          status: 'sent',
        },
        {
          id: 'inv-old',
          invoice_number: 'RE-OLD',
          invoice_date: '2026-09-01',
          total_amount_rappen: 12500,
          payment_status: 'pending',
          status: 'sent',
        },
      ],
    })
    expect(result.invoices[0]).not.toHaveProperty('billing_email')
    expect(result.invoices[0]).not.toHaveProperty('user_id')
    const invoiceCall = db.calls.find((call) => call.table === 'invoices_with_details')
    expect(invoiceCall?.filters).toEqual(expect.arrayContaining([
      { column: 'company_id', value: COMPANY },
      { column: 'tenant_id', value: TENANT },
      { column: 'document_kind', value: 'invoice' },
    ]))
    expect(invoiceCall?.order).toEqual({ column: 'created_at', ascending: false })
    expect(db.mutations).toEqual([])
    expect(db.invoices).toEqual(before)
  })

  it('returns an empty array when the company has no directly linked invoices', async () => {
    db.invoices = db.invoices.filter((row) => row.company_id !== COMPANY || row.tenant_id !== TENANT || row.document_kind !== 'invoice')
    await expect(getInvoices(COMPANY)).resolves.toEqual({ invoices: [] })
    expect(db.mutations).toEqual([])
  })

  it('does not expose another tenant company or its invoices', async () => {
    await expect(getInvoices(OTHER_COMPANY)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Firma nicht gefunden',
    })
    expect(db.calls.map((call) => call.table)).toEqual(['companies'])
    expect(db.calls[0]?.filters).toEqual([
      { column: 'id', value: OTHER_COMPANY },
      { column: 'tenant_id', value: TENANT },
    ])
    expect(db.mutations).toEqual([])
  })

  it('rejects an unknown company id without returning invoice rows', async () => {
    await expect(getInvoices(UNKNOWN_COMPANY)).rejects.toMatchObject({ statusCode: 404 })
    expect(db.calls.map((call) => call.table)).toEqual(['companies'])
    expect(db.mutations).toEqual([])
  })

  it('rejects a non-uuid company id before querying', async () => {
    await expect(getInvoices('not-a-uuid')).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Ungültige Firmen-ID',
    })
    expect(db.calls).toEqual([])
    expect(db.mutations).toEqual([])
  })

  it('keeps the authenticated tenant when the query string names another tenant', async () => {
    const result = await getInvoices(COMPANY)
    expect(result.invoices.map((row) => row.id)).toEqual(['inv-new', 'inv-old'])
    expect(db.calls.every((call) => call.filters.some((filter) => filter.column === 'tenant_id' && filter.value === TENANT))).toBe(true)
    expect(db.calls.some((call) => call.filters.some((filter) => filter.value === OTHER))).toBe(false)
  })

  it('propagates a database failure instead of an empty invoice list', async () => {
    db.invoiceError = { message: 'boom', code: 'XX000' }
    await expect(getInvoices(COMPANY)).rejects.toMatchObject({ statusCode: 503 })
    expect(db.mutations).toEqual([])
  })

  it('rejects an incomplete invoice page instead of returning a partial list', async () => {
    db.countOverride = 501
    await expect(getInvoices(COMPANY)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Rechnungsliste unvollständig',
    })
    expect(db.mutations).toEqual([])
  })

  it('allows the companies-page roles and denies everyone else', async () => {
    for (const role of endpointRoles) {
      db = freshDb()
      mocks.getSupabaseAdmin.mockReturnValue({ from: query })
      mocks.getAuthenticatedUser.mockResolvedValue(session(role))
      await expect(getInvoices(COMPANY)).resolves.toMatchObject({ invoices: expect.any(Array) })
    }

    for (const role of [null, 'client', 'tenant_admin'] as const) {
      db = freshDb()
      mocks.getSupabaseAdmin.mockReturnValue({ from: query })
      mocks.getAuthenticatedUser.mockResolvedValue(session(role))
      const expected = role === null ? 401 : 403
      await expect(getInvoices(COMPANY)).rejects.toMatchObject({ statusCode: expected })
      expect(db.calls).toEqual([])
    }

    mocks.getAuthenticatedUser.mockResolvedValue(session('admin', { is_active: false }))
    await expect(getInvoices(COMPANY)).rejects.toMatchObject({ statusCode: 403 })

    mocks.getAuthenticatedUser.mockResolvedValue(session('admin', { tenant_id: '' }))
    await expect(getInvoices(COMPANY)).rejects.toMatchObject({ statusCode: 403 })
    expect(db.mutations).toEqual([])
  })
})

describe('company invoice tab state', () => {
  const vue = read('pages/admin/companies.vue')
  const invoicesTab = vue.slice(
    vue.indexOf("detailTab === 'Rechnungen'"),
    vue.indexOf('Invoice Create Modal'),
  )

  it('loads the verified company endpoint and separates loading, empty, and error', () => {
    expect(vue).not.toContain('/api/admin/invoices/list')
    expect(vue).toContain('companyInvoicesPath(companyId)')
    expect(vue).toContain('applyCompanyInvoiceResult')
    expect(invoicesTab.indexOf("invoiceLoadPhase === 'loading'")).toBeGreaterThan(-1)
    expect(invoicesTab.indexOf("invoiceLoadPhase === 'loading'")).toBeLessThan(invoicesTab.indexOf("invoiceLoadPhase === 'error'"))
    expect(invoicesTab.indexOf("invoiceLoadPhase === 'error'")).toBeLessThan(invoicesTab.indexOf('Noch keine Rechnungen.'))
    expect(invoicesTab).toContain('Erneut versuchen')
    expect(vue).toMatch(/function onInvoiceCreated\(\) \{\s*showInvoiceCreateModal\.value = false\s*loadCompanyInvoices\(\)/)
  })

  it('builds the reload path from the selected company id', () => {
    expect(companyInvoicesPath(COMPANY)).toBe(`/api/admin/companies/${COMPANY}/invoices`)
    expect(companyInvoicesPath('a/b')).toBe('/api/admin/companies/a%2Fb/invoices')
  })

  it('shows an API failure as an error and a successful empty query as ready', () => {
    const request = startCompanyInvoiceRequest(COMPANY, 1).request
    const current = { companyId: COMPANY, generation: 1 }
    const failed = applyCompanyInvoiceResult(request, current, {
      ok: false,
      error: companyInvoiceLoadErrorMessage({ data: { statusMessage: 'Database error' } }),
    })
    expect(failed).toEqual({
      phase: 'error',
      companyId: COMPANY,
      invoices: [],
      error: 'Database error',
    })
    expect(failed?.error).not.toContain('Noch keine Rechnungen')
    expect(companyInvoiceLoadErrorMessage({ data: { message: 'Firma nicht gefunden' } })).toBe('Firma nicht gefunden')
    expect(companyInvoiceLoadErrorMessage(new Error('network'))).toBe(COMPANY_INVOICE_LOAD_ERROR)

    const empty = applyCompanyInvoiceResult(request, current, { ok: true, invoices: [] })
    expect(empty).toEqual({ phase: 'ready', companyId: COMPANY, invoices: [], error: '' })
  })

  it('drops a late response for company A after company B was selected', () => {
    const companyA = startCompanyInvoiceRequest('company-a', 1)
    const companyB = startCompanyInvoiceRequest('company-b', 2)
    expect(companyB.view).toEqual({ phase: 'loading', companyId: 'company-b', invoices: [], error: '' })

    const lateA = applyCompanyInvoiceResult(
      companyA.request,
      { companyId: 'company-b', generation: 2 },
      { ok: true, invoices: [{ id: 'inv-a' }] },
    )
    const lateError = applyCompanyInvoiceResult(
      companyA.request,
      { companyId: 'company-b', generation: 2 },
      { ok: false, error: 'Database error' },
    )
    const settledB = applyCompanyInvoiceResult(
      companyB.request,
      { companyId: 'company-b', generation: 2 },
      { ok: true, invoices: [{ id: 'inv-b' }] },
    )

    expect(lateA).toBeNull()
    expect(lateError).toBeNull()
    expect(settledB).toEqual({
      phase: 'ready',
      companyId: 'company-b',
      invoices: [{ id: 'inv-b' }],
      error: '',
    })
  })
})
