import { beforeEach, describe, expect, it, vi } from 'vitest'

const pdfCalls: Array<{ items?: Array<Record<string, unknown>> }> = []
const emailCalls: Array<{ html?: string }> = []
const itemUpdates: string[] = []

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))
vi.mock('~/server/utils/auth', () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))
vi.mock('~/server/utils/invoice-pdf', () => ({
  formatTenantContactPerson: () => '',
  generateInvoicePdf: async (data: { items?: Array<Record<string, unknown>> }) => {
    pdfCalls.push(data)
    return Buffer.from('pdf')
  },
}))
vi.mock('~/server/utils/tenant-logo-for-pdf', () => ({
  loadTenantLogoForPdf: async () => null,
  resolveTenantWideLogoUrl: () => null,
}))
vi.mock('~/server/utils/upload-pdf-public', () => ({
  uploadPdfAndGetPublicUrl: async () => ({ pdfUrl: 'https://example.test/invoice.pdf' }),
}))
vi.mock('~/server/utils/email', () => ({
  sendEmail: async (payload: { html?: string }) => {
    emailCalls.push(payload)
  },
}))
vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('readBody', mocks.readBody)
vi.stubGlobal('createError', (err: { statusCode: number, statusMessage?: string }) => {
  const error = new Error(err.statusMessage || 'error') as Error & { statusCode: number }
  error.statusCode = err.statusCode
  return error
})

vi.mock('~/server/utils/invoice-billing-snapshot', () => ({
  invoicePersonNames: () => ({ customerName: 'Max Muster', studentName: 'Max Muster' }),
  invoiceQrDebtorName: () => 'Max Muster',
  loadUserAddressForInvoice: async () => null,
  pdfBillingFields: () => ({
    billingStreet: 'Weg 1',
    billingZip: '8000',
    billingCity: 'Zürich',
    billingEmail: 'max@example.ch',
  }),
  isPlaceholderBillingEmail: () => false,
}))

const TENANT = 'tenant-a'
const STAFF = 'staff-1'
const MAX = 'student-max'
const ANNA = 'student-anna'
const APT = 'apt-1'

type Row = Record<string, unknown>

function createDb() {
  const tables: Record<string, Row[]> = {
    users: [
      { id: STAFF, auth_user_id: 'auth-staff', tenant_id: TENANT, first_name: 'Ada', last_name: 'Admin', email: 'ada@example.ch' },
      { id: MAX, tenant_id: TENANT, first_name: 'Max', last_name: 'Muster' },
      { id: ANNA, tenant_id: TENANT, first_name: 'Anna', last_name: 'Beispiel' },
    ],
    invoices_with_details: [
      {
        id: 'inv-private',
        tenant_id: TENANT,
        billing_type: 'individual',
        billing_email: 'max@example.ch',
        invoice_number: 'RE-1',
        invoice_date: '2026-09-01',
        due_date: '2026-09-30',
        status: 'sent',
        subtotal_rappen: 9000,
        total_amount_rappen: 9000,
        vat_rate: 0,
        vat_amount_rappen: 0,
        discount_amount_rappen: 0,
        user_id: MAX,
      },
      {
        id: 'inv-company',
        tenant_id: TENANT,
        billing_type: 'company',
        billing_company_name: 'Muster AG',
        billing_email: 'firma@example.ch',
        invoice_number: 'RE-2',
        invoice_date: '2026-09-01',
        due_date: '2026-09-30',
        status: 'sent',
        subtotal_rappen: 9000,
        total_amount_rappen: 9000,
        vat_rate: 0,
        vat_amount_rappen: 0,
        discount_amount_rappen: 0,
        user_id: null,
      },
    ],
    invoice_items: [
      {
        id: 'line-private',
        invoice_id: 'inv-private',
        tenant_id: TENANT,
        product_name: 'Fahrstunde',
        event_type_code: 'lesson',
        user_id: MAX,
        appointment_id: APT,
        quantity: 1,
        unit_price_rappen: 9000,
        total_price_rappen: 9000,
        sort_order: 0,
      },
      {
        id: 'line-company',
        invoice_id: 'inv-company',
        tenant_id: TENANT,
        product_name: 'Fahrstunde',
        event_type_code: 'lesson',
        user_id: MAX,
        appointment_id: APT,
        quantity: 1,
        unit_price_rappen: 9000,
        total_price_rappen: 9000,
        sort_order: 0,
      },
    ],
    appointments: [
      {
        id: APT,
        tenant_id: TENANT,
        event_type_code: 'exam',
        user_id: ANNA,
        title: 'Prüfung',
        start_time: '2026-09-02T08:00:00.000Z',
        duration_minutes: 45,
      },
    ],
    event_types: [
      { tenant_id: TENANT, code: 'lesson', name: 'Fahrlektion' },
      { tenant_id: TENANT, code: 'exam', name: 'Prüfung' },
    ],
    payments: [
      {
        invoice_id: 'inv-private',
        tenant_id: TENANT,
        appointment_id: APT,
        lesson_price_rappen: 9000,
        admin_fee_rappen: 0,
        products_price_rappen: 0,
        discount_amount_rappen: 0,
        voucher_discount_rappen: 0,
        credit_used_rappen: 0,
        amount_paid_rappen: 0,
      },
      {
        invoice_id: 'inv-company',
        tenant_id: TENANT,
        appointment_id: APT,
        lesson_price_rappen: 9000,
        admin_fee_rappen: 0,
        products_price_rappen: 0,
        discount_amount_rappen: 0,
        voucher_discount_rappen: 0,
        credit_used_rappen: 0,
        amount_paid_rappen: 0,
      },
    ],
    tenants: [{ id: TENANT, name: 'Fahrschule', qr_iban: null }],
    product_sales: [],
  }

  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = []
    const matched = () => (tables[table] || []).filter((row) => filters.every((fn) => fn(row)))
    const chain = {
      select: () => chain,
      eq(col: string, val: unknown) {
        filters.push((row) => row[col] === val)
        return chain
      },
      in(col: string, vals: unknown[]) {
        filters.push((row) => vals.includes(row[col]))
        return chain
      },
      order: () => chain,
      update(payload: Row) {
        if (table === 'invoice_items') itemUpdates.push(JSON.stringify(payload))
        return chain
      },
      maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
      single: async () => ({ data: matched()[0] || null, error: null }),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ data: matched(), error: null }).then(resolve)
      },
    }
    return chain
  }

  return { from, tables }
}

async function download() {
  return (await import('../../api/invoices/download.post')).default as (event: unknown) => Promise<unknown>
}

async function resend() {
  return (await import('../../api/invoices/resend.post')).default as (event: unknown) => Promise<unknown>
}

describe('historical invoice snapshot', () => {
  beforeEach(() => {
    pdfCalls.length = 0
    emailCalls.length = 0
    itemUpdates.length = 0
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-staff' })
    mocks.getSupabaseAdmin.mockReturnValue(createDb())
  })

  it('download keeps Fahrstunde after the appointment becomes an exam for another student', async () => {
    mocks.readBody.mockResolvedValue({ invoiceId: 'inv-private' })
    await download().then((fn) => fn({}))
    const line = pdfCalls[0]?.items?.[0]
    expect(line?.product_name).toBe('Fahrstunde')
    expect(line?.breakdown_label).toBe('Fahrstunde')
    expect(JSON.stringify(line)).not.toContain('Prüfung')
    expect(JSON.stringify(line)).not.toContain('Anna')
    expect(itemUpdates).toEqual([])
  })

  it('resend keeps the same stored label', async () => {
    mocks.readBody.mockResolvedValue({ invoiceId: 'inv-private' })
    await resend().then((fn) => fn({}))
    const line = pdfCalls[0]?.items?.[0]
    expect(line?.product_name).toBe('Fahrstunde')
    expect(line?.breakdown_label).toBe('Fahrstunde')
    expect(emailCalls[0]?.html).toContain('Fahrstunde')
    expect(emailCalls[0]?.html).not.toContain('Prüfung')
    expect(itemUpdates).toEqual([])
  })

  it('company download appends the stored student, not the appointment student', async () => {
    mocks.readBody.mockResolvedValue({ invoiceId: 'inv-company' })
    await download().then((fn) => fn({}))
    const line = pdfCalls[0]?.items?.[0]
    expect(line?.product_name).toBe('Fahrstunde – Max Muster')
    expect(line?.breakdown_label).toBe('Fahrstunde')
    expect(String(line?.product_name)).not.toContain('Anna')
    expect(itemUpdates).toEqual([])
  })
})
