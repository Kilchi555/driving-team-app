import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_FAILED_MESSAGE, LINK_BLOCKED_MESSAGE, TRIGGER_CHANGED_MESSAGE } from '~/server/utils/company-invoice-link'

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  requireAdminProfile: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: async (event: { body?: unknown }) => event.body,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  requireAdminProfile: (...args: unknown[]) => mocks.requireAdminProfile(...args),
}))

vi.mock('~/server/utils/account-switch', () => ({
  readImpersonatorCookie: () => null,
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-4111-8111-111111111111'
const COMPANY = '8d195a31-0fa6-423f-8ef9-e2e893e17e2d'
const FOREIGN_COMPANY = '22222222-2222-4222-8222-222222222222'
const SUGGESTED = '525bf160-906c-4886-9284-b6e68eb6195c'
const INVOICE = '9364490e-7c25-4f4a-a5d6-35b3299fff86'
const UPDATED_AT = '2026-02-09T08:07:35.62906+00:00'

type Row = Record<string, unknown>
type Filter = { column: string; value: unknown }

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function roleListFrom(source: string): string[] {
  const match = source.match(/requireAdminProfile\(event,\s*(\[[^\]]+\])\s*\)/)
  if (!match) throw new Error('role list not found')
  return JSON.parse(match[1].replace(/'/g, '"'))
}

const endpointRoles = roleListFrom(read('server/api/admin/invoices/link-company.post.ts'))

function linkable(partial: Row = {}): Row {
  return {
    id: INVOICE,
    tenant_id: TENANT,
    company_id: null,
    user_id: 'user-1',
    document_kind: 'invoice',
    billing_type: 'company',
    billing_company_name: 'Beispiel GmbH',
    billing_city: 'Bern',
    billing_zip: '3000',
    invoice_number: 'RE-HIST',
    invoice_date: '2026-02-09',
    created_at: UPDATED_AT,
    updated_at: UPDATED_AT,
    due_date: '2026-12-31',
    status: 'sent',
    payment_status: 'pending',
    subtotal_rappen: 10000,
    vat_rate: '0.00',
    vat_amount_rappen: 0,
    discount_amount_rappen: 0,
    total_amount_rappen: 10000,
    paid_amount_rappen: 0,
    ...partial,
  }
}

function freshDb() {
  return {
    invoices: [
      linkable(),
      linkable({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        tenant_id: OTHER,
        invoice_number: 'RE-FOREIGN',
      }),
      linkable({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        company_id: COMPANY,
        invoice_number: 'RE-LINKED',
        updated_at: '2026-03-01T00:00:00.000Z',
      }),
    ] as Row[],
    companies: [
      { id: COMPANY, tenant_id: TENANT, name: 'Gewählte GmbH', created_at: '2026-01-01T00:00:00.000Z', city: 'Bern' },
      { id: SUGGESTED, tenant_id: TENANT, name: 'Beispiel GmbH', created_at: '2026-08-13T04:38:59.000Z', city: 'Bern' },
      { id: FOREIGN_COMPANY, tenant_id: OTHER, name: 'Fremde GmbH', created_at: '2026-01-01T00:00:00.000Z', city: 'Basel' },
    ] as Row[],
    users: [{ id: 'user-1', tenant_id: TENANT, company_id: SUGGESTED }] as Row[],
    audit: [] as Row[],
    mutations: [] as Array<{ table: string; op: string; patch: Row | null }>,
    corruptOnUpdate: false,
    auditError: null as { message: string } | null,
    forceUpdateMiss: false,
  }
}

let db = freshDb()

function matches(row: Row, filters: Filter[], nullFilters: Filter[], inFilters: Array<{ column: string; values: unknown[] }>) {
  const eqOk = filters.every((filter) => row[filter.column] === filter.value)
  const nullOk = nullFilters.every((filter) => filter.value === null && (row[filter.column] === null || row[filter.column] === undefined))
  const inOk = inFilters.every((filter) => filter.values.includes(row[filter.column]))
  return eqOk && nullOk && inOk
}

function project(row: Row, select: string | null) {
  if (!select || select.trim() === '*') return { ...row }
  const projected: Row = {}
  for (const column of select.split(',').map((part) => part.trim()).filter(Boolean)) {
    projected[column] = row[column]
  }
  return projected
}

function rowsFor(table: string) {
  if (table === 'invoices') return db.invoices
  if (table === 'companies') return db.companies
  if (table === 'users') return db.users
  if (table === 'audit_logs') return db.audit
  throw new Error(`unexpected table ${table}`)
}

function query(table: string) {
  const state = {
    op: 'select' as 'select' | 'update' | 'insert',
    select: null as string | null,
    filters: [] as Filter[],
    nullFilters: [] as Filter[],
    inFilters: [] as Array<{ column: string; values: unknown[] }>,
    limit: null as number | null,
    patch: null as Row | null,
  }
  const execute = () => {
    const tableRows = rowsFor(table)
    if (state.op === 'insert') {
      db.mutations.push({ table, op: 'insert', patch: state.patch })
      if (table === 'audit_logs' && db.auditError) return { data: null, error: db.auditError, count: null }
      if (state.patch) tableRows.push({ ...state.patch })
      return { data: state.patch, error: null, count: null }
    }
    const matched = tableRows.filter((row) => matches(row, state.filters, state.nullFilters, state.inFilters))
    if (state.op === 'update') {
      db.mutations.push({ table, op: 'update', patch: state.patch })
      if (db.forceUpdateMiss) return { data: [], error: null, count: 0 }
      for (const row of matched) {
        Object.assign(row, state.patch)
        if (db.corruptOnUpdate && table === 'invoices') {
          row.payment_status = 'overdue'
          row.status = 'overdue'
        }
      }
      return { data: matched.map((row) => project(row, state.select)), error: null, count: matched.length }
    }
    const count = matched.length
    const limited = state.limit == null ? matched : matched.slice(0, state.limit)
    return { data: limited.map((row) => project(row, state.select)), error: null, count }
  }
  const chain = {
    select(columns: string) {
      state.select = columns
      return chain
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value })
      return chain
    },
    is(column: string, value: unknown) {
      state.nullFilters.push({ column, value })
      return chain
    },
    in(column: string, values: unknown[]) {
      state.inFilters.push({ column, values })
      return chain
    },
    order() {
      return chain
    },
    limit(value: number) {
      state.limit = value
      return chain
    },
    update(patch: Row) {
      state.op = 'update'
      state.patch = patch
      return chain
    },
    insert(patch: Row) {
      state.op = 'insert'
      state.patch = patch
      return chain
    },
    maybeSingle: async () => {
      const result = execute()
      const data = Array.isArray(result.data) ? result.data[0] || null : result.data
      return { data, error: result.error, count: result.count }
    },
    then: (
      onFulfilled: (value: { data: unknown; error: unknown; count: number | null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(execute()).then(onFulfilled, onRejected),
  }
  return chain
}

function eventFor(body?: Row, role = 'admin') {
  return { body, role, node: { req: { url: '/api/admin/invoices/link-company?tenant_id=ignored' } } }
}

async function postLink(body: Row, role = 'admin') {
  const handler = (await import('~/server/api/admin/invoices/link-company.post')).default as (
    event: unknown,
  ) => Promise<Row>
  return handler(eventFor(body, role))
}

async function getUnlinked() {
  const handler = (await import('~/server/api/admin/invoices/unlinked-company.get')).default as (
    event: unknown,
  ) => Promise<Row>
  return handler(eventFor())
}

function validBody(partial: Row = {}): Row {
  return {
    invoice_id: INVOICE,
    company_id: COMPANY,
    expected_updated_at: UPDATED_AT,
    confirm: true,
    ...partial,
  }
}

describe('historical company invoice linking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db = freshDb()
    mocks.requireAdminProfile.mockImplementation(async (event: { role?: string }) => {
      const role = event.role || 'admin'
      if (!endpointRoles.includes(role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – insufficient role' })
      }
      return { id: `${role}-1`, tenant_id: TENANT, role, email: `${role}@example.test`, auth_user_id: `auth-${role}` }
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from: query })
  })

  it('keeps the companies admin role list and leaves creation linking intact', () => {
    const post = read('server/api/admin/invoices/link-company.post.ts')
    const list = read('server/api/admin/invoices/unlinked-company.get.ts')
    const create = read('server/api/invoices/create.post.ts')
    expect(roleListFrom(post)).toEqual(roleListFrom(read('server/api/admin/companies.ts')))
    expect(roleListFrom(list)).toEqual(endpointRoles)
    expect(post).not.toContain('payment_status:')
    expect(post).not.toContain('total_amount_rappen:')
    expect(post).toContain('previous_company_id: null')
    expect(list).not.toContain('.update(')
    expect(list).not.toContain('.insert(')
    expect(list).not.toContain('getQuery')
    expect(create).toContain('company_id: invoiceData.company_id || null')
  })

  it('links one unlinked invoice and writes an audit row with the old and new company', async () => {
    const result = await postLink(validBody())
    expect(result).toMatchObject({ success: true, invoice_id: INVOICE, previous_company_id: null, company_id: COMPANY })
    const invoice = db.invoices.find((row) => row.id === INVOICE)
    expect(invoice).toMatchObject({
      company_id: COMPANY,
      payment_status: 'pending',
      status: 'sent',
      total_amount_rappen: 10000,
      vat_amount_rappen: 0,
    })
    const update = db.mutations.find((mutation) => mutation.table === 'invoices' && mutation.op === 'update')
    expect(Object.keys(update?.patch || {}).sort()).toEqual(['company_id', 'updated_at'])
    expect(db.audit).toHaveLength(1)
    expect(db.audit[0]).toMatchObject({
      user_id: 'admin-1',
      action: 'invoice.company_link',
      resource_type: 'invoice',
      resource_id: INVOICE,
      tenant_id: TENANT,
      status: 'success',
      details: { invoice_id: INVOICE, previous_company_id: null, new_company_id: COMPANY },
    })
    expect(JSON.stringify(db.audit[0].details)).not.toContain('Beispiel')
  })

  it('does not apply a membership or name suggestion unless that company is confirmed', async () => {
    const list = await getUnlinked()
    const invoices = list.invoices as Array<Row & { suggestions: Array<{ company_id: string; authoritative: boolean }> }>
    const candidate = invoices.find((invoice) => invoice.id === INVOICE)
    expect(list.suggestions_authoritative).toBe(false)
    expect(candidate?.suggestions[0]).toMatchObject({ company_id: SUGGESTED, authoritative: false })
    expect(db.mutations.filter((mutation) => mutation.op === 'update')).toHaveLength(0)
    await postLink(validBody())
    expect(db.invoices.find((row) => row.id === INVOICE)?.company_id).toBe(COMPANY)
  })

  it('rejects a missing role before reading invoices', async () => {
    await expect(postLink(validBody(), 'client')).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
    expect(db.mutations).toHaveLength(0)
  })

  it('rejects an invoice from another tenant', async () => {
    await expect(postLink(validBody({ invoice_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }))).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(db.mutations.filter((mutation) => mutation.op === 'update')).toHaveLength(0)
  })

  it('rejects a company from another tenant and an unknown company', async () => {
    await expect(postLink(validBody({ company_id: FOREIGN_COMPANY }))).rejects.toMatchObject({ statusCode: 404 })
    await expect(postLink(validBody({ company_id: '33333333-3333-4333-8333-333333333333' }))).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(db.invoices.find((row) => row.id === INVOICE)?.company_id).toBeNull()
  })

  it('does not overwrite an invoice that already has a company', async () => {
    await expect(postLink(validBody({
      invoice_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expected_updated_at: '2026-03-01T00:00:00.000Z',
    }))).rejects.toMatchObject({ statusCode: 409 })
    expect(db.invoices.find((row) => row.id === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')?.company_id).toBe(COMPANY)
    expect(db.mutations.filter((mutation) => mutation.op === 'update')).toHaveLength(0)
  })

  it('rejects a stale version and a concurrent update', async () => {
    await expect(postLink(validBody({ expected_updated_at: '2026-02-10T00:00:00.000Z' }))).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(db.mutations.filter((mutation) => mutation.op === 'update')).toHaveLength(0)

    db.forceUpdateMiss = true
    await expect(postLink(validBody())).rejects.toMatchObject({ statusCode: 409 })
    expect(db.invoices.find((row) => row.id === INVOICE)?.company_id).toBeNull()
  })

  it('requires confirmation and ignores payment fields in the body', async () => {
    await expect(postLink(validBody({ confirm: false }))).rejects.toMatchObject({ statusCode: 400 })
    await expect(postLink(validBody({ total_amount_rappen: 1 }))).rejects.toMatchObject({ statusCode: 400 })
    expect(db.mutations).toHaveLength(0)
  })

  it('refuses invoices whose existing triggers would change status or amounts', async () => {
    db.invoices[0] = linkable({ due_date: '2026-01-01' })
    await expect(postLink(validBody())).rejects.toMatchObject({ statusCode: 409, message: LINK_BLOCKED_MESSAGE })
    db.invoices[0] = linkable({ vat_amount_rappen: 5 })
    await expect(postLink(validBody())).rejects.toMatchObject({ statusCode: 409, message: LINK_BLOCKED_MESSAGE })
    expect(db.mutations.filter((mutation) => mutation.op === 'update')).toHaveLength(0)
  })

  it('rolls the company back when the update trigger changes payment status', async () => {
    db.corruptOnUpdate = true
    await expect(postLink(validBody())).rejects.toMatchObject({ statusCode: 500, message: TRIGGER_CHANGED_MESSAGE })
    expect(db.invoices.find((row) => row.id === INVOICE)?.company_id).toBeNull()
    expect(db.audit).toHaveLength(0)
  })

  it('rolls the company back when the audit insert fails', async () => {
    db.auditError = { message: 'audit down' }
    await expect(postLink(validBody())).rejects.toMatchObject({ statusCode: 500, message: AUDIT_FAILED_MESSAGE })
    expect(db.invoices.find((row) => row.id === INVOICE)?.company_id).toBeNull()
  })

  it('lists only this tenant’s unlinked company invoices', async () => {
    const list = await getUnlinked()
    const ids = (list.invoices as Array<{ id: string }>).map((invoice) => invoice.id)
    expect(ids).toEqual([INVOICE])
    expect(list.suggestions_authoritative).toBe(false)
    const candidate = (list.invoices as Array<Row>)[0]
    expect(candidate).not.toHaveProperty('user_id')
    expect(candidate).not.toHaveProperty('total_amount_rappen')
    expect(candidate).not.toHaveProperty('payment_status')
  })
})
