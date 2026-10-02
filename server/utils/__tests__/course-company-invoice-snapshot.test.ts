import { beforeEach, describe, expect, it, vi } from 'vitest'

const inserts: Record<string, Array<Record<string, unknown>>> = {}

vi.mock('~/server/utils/allocate-invoice-number', () => ({ allocateInvoiceNumber: async () => 'RE-KURS' }))
vi.mock('~/server/utils/invoice-due-date', () => ({
  computeInvoiceDueDate: () => '2026-10-25',
  getTenantInvoiceDueDays: async () => 14,
}))
vi.mock('~/server/utils/invoice-vat', () => ({
  getTenantDefaultVatRate: async () => 0,
  computeVatAmountRappen: () => 0,
}))
vi.mock('~/utils/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const tables: Record<string, Array<Record<string, unknown>>> = {
  courses: [{
    id: 'course-1',
    name: 'Erste Hilfe',
    tenant_id: 'tenant-a',
    company_id: 'company-1',
    billing_mode: 'company_collective',
    price_per_participant_rappen: 12000,
  }],
  companies: [{
    id: 'company-1',
    tenant_id: 'tenant-a',
    name: 'Muster AG',
    email: 'firma@example.ch',
    street: 'Weg',
    street_nr: '1',
    zip: '8000',
    city: 'Zürich',
    country: 'CH',
  }],
  course_registrations: [
    {
      id: 'reg-1',
      user_id: 'student-max',
      first_name: 'Max',
      last_name: 'Muster',
      email: 'max@example.ch',
      amount_paid_rappen: 12000,
      payment_status: 'pending',
      invoice_id: null,
      status: 'active',
      deleted_at: null,
      tenant_id: 'tenant-a',
      course_id: 'course-1',
    },
    {
      id: 'reg-2',
      user_id: 'student-anna',
      first_name: 'Anna',
      last_name: 'Beispiel',
      email: 'anna@example.ch',
      amount_paid_rappen: 12000,
      payment_status: 'pending',
      invoice_id: null,
      status: 'active',
      deleted_at: null,
      tenant_id: 'tenant-a',
      course_id: 'course-1',
    },
  ],
  tenants: [{ id: 'tenant-a', name: 'Fahrschule' }],
  invoices: [],
  invoice_items: [],
  payments: [],
}

function from(table: string) {
  const chain: {
    _pending?: Record<string, unknown> | Array<Record<string, unknown>>
    select: () => typeof chain
    eq: () => typeof chain
    neq: () => typeof chain
    is: () => typeof chain
    update: () => typeof chain
    insert: (payload: Record<string, unknown> | Array<Record<string, unknown>>) => typeof chain
    single: () => Promise<{ data: Record<string, unknown> | undefined, error: null }>
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null, error: null }>
    then: (resolve: (value: unknown) => unknown) => Promise<unknown>
  } = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    is: () => chain,
    update: () => chain,
    insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
      const list = Array.isArray(payload) ? payload : [payload]
      const stored = list.map((row, index) => ({ id: `${table}-${index}`, ...row }))
      inserts[table] = [...(inserts[table] || []), ...stored]
      chain._pending = stored.length === 1 ? stored[0] : stored
      return chain
    },
    single: async () => ({ data: chain._pending || tables[table][0], error: null }),
    maybeSingle: async () => ({ data: tables[table][0] || null, error: null }),
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data: chain._pending || tables[table], error: null }).then(resolve)
    },
  }
  return chain
}

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from }),
}))

describe('createCompanyCourseInvoice snapshot', () => {
  beforeEach(() => {
    for (const key of Object.keys(inserts)) inserts[key] = []
  })

  it('keeps participant text, stores user_id, and does not invent an event type', async () => {
    const { createCompanyCourseInvoice } = await import('../course-enrollment-billing')
    const result = await createCompanyCourseInvoice({
      tenantId: 'tenant-a',
      adminUserId: 'admin-1',
      courseId: 'course-1',
      sendEmail: false,
    })
    expect(result.participantCount).toBe(2)
    expect(result.totalRappen).toBe(24000)
    expect(inserts.invoice_items).toEqual([
      expect.objectContaining({
        product_name: 'Erste Hilfe',
        product_description: 'Teilnehmer: Max Muster',
        user_id: 'student-max',
        event_type_code: null,
        unit_price_rappen: 12000,
      }),
      expect.objectContaining({
        product_name: 'Erste Hilfe',
        product_description: 'Teilnehmer: Anna Beispiel',
        user_id: 'student-anna',
        event_type_code: null,
        unit_price_rappen: 12000,
      }),
    ])
  })
})
