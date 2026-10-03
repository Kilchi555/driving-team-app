import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  claimPaymentsForInvoice,
  PaymentClaimRejectedError,
  stampInvoiceSourceRow,
} from '../invoice-tenant-guards'
import type { InvoiceDraftPayload, PersistAndSendActor } from '../invoice-persist-and-send'

const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ id: 'mail-1' })))

vi.mock('~/server/utils/email', () => ({ sendEmail: sendEmailMock }))
vi.mock('~/server/utils/invoice-pdf', () => ({
  generateInvoicePdf: vi.fn(async () => Buffer.from('pdf')),
  formatTenantContactPerson: () => 'Ada Admin',
}))
vi.mock('~/server/utils/tenant-logo-for-pdf', () => ({
  loadTenantLogoForPdf: vi.fn(async () => null),
  resolveTenantWideLogoUrl: () => null,
}))
vi.mock('~/server/utils/invoice-email', () => ({
  buildInvoiceEmailHtml: () => '<p>invoice</p>',
}))
vi.mock('~/server/utils/tenant-terminology', () => ({
  getTenantTerminology: vi.fn(async () => ({ appointment: 'Termin', client: 'Kunde' })),
  appointmentCountLabel: () => '1 Termin',
}))
vi.mock('~/server/utils/invoice-billing-snapshot', () => ({
  applyMissingInvoiceBilling: vi.fn(async (_supabase: unknown, _tenantId: string, draft: unknown) => draft),
  invoiceQrDebtorName: () => 'Kunde',
  pdfBillingFields: () => ({ billingStreet: '', billingZip: '', billingCity: '' }),
}))
vi.mock('~/utils/billing-address-map', () => ({
  formatBillingPersonLabel: () => 'Ada Kundin',
  joinStreetAndNumber: () => 'Weg 1',
  snapshotBillingCompanyName: () => '',
}))

type Row = Record<string, unknown>
type Filter = { type: 'eq' | 'in' | 'is'; col: string; val: unknown }
type QueryResult = { data: Row[]; error: null }

function createMemorySupabase(tables: Record<string, Row[]>, hooks?: {
  beforePaymentUpdate?: () => void
}) {
  function matches(row: Row, filters: Filter[]) {
    return filters.every((filter) => {
      if (filter.type === 'eq') return row[filter.col] === filter.val
      if (filter.type === 'in') return (filter.val as unknown[]).includes(row[filter.col])
      if (filter.type === 'is') return filter.val === null ? row[filter.col] == null : row[filter.col] === filter.val
      return false
    })
  }

  return {
    tables,
    async rpc() {
      return { data: 'RE-2026-0001', error: null }
    },
    from(table: string) {
      if (!tables[table]) tables[table] = []
      const state: { filters: Filter[]; op: 'select' | 'insert' | 'update' | 'delete'; payload: Row | Row[] | null } = {
        filters: [],
        op: 'select',
        payload: null,
      }
      const execute = (): QueryResult => {
        if (state.op === 'update' && table === 'payments') hooks?.beforePaymentUpdate?.()
        const rows = tables[table]
        if (state.op === 'insert') {
          const incoming = Array.isArray(state.payload) ? state.payload : [state.payload || {}]
          const stored = incoming.map((row) => ({ id: row.id || crypto.randomUUID(), ...row }))
          rows.push(...stored)
          return { data: stored.map((row) => ({ ...row })), error: null }
        }
        const matched = rows.filter((row) => matches(row, state.filters))
        if (state.op === 'delete') {
          const matchedIds = new Set(matched.map((row) => row.id))
          tables[table] = rows.filter((row) => !matchedIds.has(row.id))
          return { data: matched.map((row) => ({ ...row })), error: null }
        }
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
        limit: () => chain,
        single: async () => {
          const result = execute()
          const row = result.data[0]
          if (!row) return { data: null, error: { message: 'missing' } }
          return { data: row, error: null }
        },
        maybeSingle: async () => {
          const result = execute()
          return { data: result.data[0] || null, error: null }
        },
        then: (
          onFulfilled: (value: QueryResult) => unknown,
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

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function payment(partial: Row): Row {
  return {
    invoice_id: null,
    payment_status: 'pending',
    payment_method: 'invoice',
    ...partial,
  }
}

function draft(paymentIds: string[]): InvoiceDraftPayload {
  return {
    user_id: 'user-1',
    tenant_id: TENANT,
    invoice_date: '2026-10-03',
    due_date: '2026-11-02',
    billing_email: 'kunde@example.com',
    billing_first_name: 'Ada',
    billing_last_name: 'Kundin',
    subtotal_rappen: 10000,
    vat_rate: 0,
    vat_amount_rappen: 0,
    total_amount_rappen: 10000,
    payment_ids: paymentIds,
    items: [{
      product_name: 'Fahrstunde',
      quantity: 1,
      unit_price_rappen: 10000,
      total_price_rappen: 10000,
    }],
  }
}

describe('claimPaymentsForInvoice', () => {
  it('links an uninvoiced payment in the same tenant', async () => {
    const db = createMemorySupabase({
      payments: [payment({ id: 'pay-own', tenant_id: TENANT })],
    })

    const result = await claimPaymentsForInvoice({
      supabase: asClient(db),
      tenantId: TENANT,
      invoiceId: 'inv-1',
      paymentIds: ['pay-own'],
    })

    expect(result.complete).toBe(true)
    expect(db.tables.payments[0]).toMatchObject({
      invoice_id: 'inv-1',
      payment_status: 'invoiced',
      payment_method: 'invoice',
    })
  })

  it('does not update a foreign tenant payment', async () => {
    const db = createMemorySupabase({
      payments: [payment({ id: 'pay-foreign', tenant_id: OTHER })],
    })

    const result = await claimPaymentsForInvoice({
      supabase: asClient(db),
      tenantId: TENANT,
      invoiceId: 'inv-1',
      paymentIds: ['pay-foreign'],
    })

    expect(result.complete).toBe(false)
    expect(result.claimedIds).toEqual([])
    expect(db.tables.payments[0].invoice_id).toBeNull()
    expect(db.tables.payments[0].payment_status).toBe('pending')
  })

  it('does not update a payment that already has an invoice', async () => {
    const db = createMemorySupabase({
      payments: [payment({ id: 'pay-own', tenant_id: TENANT, invoice_id: 'inv-existing', payment_status: 'invoiced' })],
    })

    const result = await claimPaymentsForInvoice({
      supabase: asClient(db),
      tenantId: TENANT,
      invoiceId: 'inv-new',
      paymentIds: ['pay-own'],
    })

    expect(result.complete).toBe(false)
    expect(db.tables.payments[0].invoice_id).toBe('inv-existing')
  })

  it('leaves a foreign payment untouched when mixed with an own payment', async () => {
    const db = createMemorySupabase({
      payments: [
        payment({ id: 'pay-own', tenant_id: TENANT }),
        payment({ id: 'pay-foreign', tenant_id: OTHER }),
      ],
    })

    const result = await claimPaymentsForInvoice({
      supabase: asClient(db),
      tenantId: TENANT,
      invoiceId: 'inv-1',
      paymentIds: ['pay-own', 'pay-foreign'],
    })

    expect(result.complete).toBe(false)
    expect(result.claimedIds).toEqual(['pay-own'])
    expect(db.tables.payments.find((row) => row.id === 'pay-foreign')?.invoice_id).toBeNull()
  })

  it('does not let a second claim overwrite an already linked payment', async () => {
    const db = createMemorySupabase({
      payments: [payment({ id: 'pay-own', tenant_id: TENANT })],
    })

    const first = await claimPaymentsForInvoice({
      supabase: asClient(db),
      tenantId: TENANT,
      invoiceId: 'inv-first',
      paymentIds: ['pay-own'],
    })
    const second = await claimPaymentsForInvoice({
      supabase: asClient(db),
      tenantId: TENANT,
      invoiceId: 'inv-second',
      paymentIds: ['pay-own'],
    })

    expect(first.complete).toBe(true)
    expect(second.complete).toBe(false)
    expect(second.claimedIds).toEqual([])
    expect(db.tables.payments[0].invoice_id).toBe('inv-first')
  })
})

describe('stampInvoiceSourceRow', () => {
  it.each(['course_registrations', 'room_bookings', 'vehicle_bookings'] as const)(
    'stamps %s only inside the current tenant',
    async (table) => {
      const db = createMemorySupabase({
        [table]: [
          { id: 'row-own', tenant_id: TENANT, invoice_id: null },
          { id: 'row-foreign', tenant_id: OTHER, invoice_id: null },
          { id: 'row-linked', tenant_id: TENANT, invoice_id: 'inv-old' },
        ],
      })

      const own = await stampInvoiceSourceRow({
        supabase: asClient(db),
        table,
        sourceId: 'row-own',
        tenantId: TENANT,
        invoiceId: 'inv-new',
      })
      const foreign = await stampInvoiceSourceRow({
        supabase: asClient(db),
        table,
        sourceId: 'row-foreign',
        tenantId: TENANT,
        invoiceId: 'inv-new',
      })
      const otherContext = await stampInvoiceSourceRow({
        supabase: asClient(db),
        table,
        sourceId: 'row-own',
        tenantId: OTHER,
        invoiceId: 'inv-other-tenant',
      })
      const alreadyLinked = await stampInvoiceSourceRow({
        supabase: asClient(db),
        table,
        sourceId: 'row-linked',
        tenantId: TENANT,
        invoiceId: 'inv-new',
      })

      expect(own.stamped).toBe(true)
      expect(foreign.stamped).toBe(false)
      expect(otherContext.stamped).toBe(false)
      expect(alreadyLinked.stamped).toBe(false)
      expect(db.tables[table].find((row) => row.id === 'row-own')?.invoice_id).toBe('inv-new')
      expect(db.tables[table].find((row) => row.id === 'row-foreign')?.invoice_id).toBeNull()
      expect(db.tables[table].find((row) => row.id === 'row-linked')?.invoice_id).toBe('inv-old')
    },
  )
})

describe('persistAndSendInvoiceDraft payment claim', () => {
  const actor: PersistAndSendActor = { id: 'staff-1', first_name: 'Ada', last_name: 'Admin', email: 'ada@example.com' }

  beforeEach(() => {
    sendEmailMock.mockClear()
  })

  function tenantDb(payments: Row[], hooks?: { beforePaymentUpdate?: () => void }) {
    return createMemorySupabase({
      tenants: [{ id: TENANT, name: 'Fahrschule', contact_email: 'office@example.com', primary_color: '#111111' }],
      payments,
      invoices: [],
      invoice_items: [],
      company_billing_addresses: [],
    }, hooks)
  }

  async function persist(db: MemoryDb, paymentIds: string[]) {
    const { persistAndSendInvoiceDraft } = await import('../invoice-persist-and-send')
    return persistAndSendInvoiceDraft({
      supabase: asClient(db),
      tenantId: TENANT,
      actor,
      draft: draft(paymentIds),
    })
  }

  it('creates and emails an appointment invoice for an own uninvoiced payment', async () => {
    const db = tenantDb([payment({ id: 'pay-own', tenant_id: TENANT })])

    const result = await persist(db, ['pay-own'])

    expect(result.invoice_number).toBe('RE-2026-0001')
    expect(result.success).toBe(true)
    expect(db.tables.payments[0].invoice_id).toBe(result.invoice_id)
    expect(db.tables.payments[0].payment_status).toBe('invoiced')
    expect(db.tables.invoices).toHaveLength(1)
    expect(sendEmailMock).toHaveBeenCalled()
  })

  it('rejects a foreign payment id without linking it or sending mail', async () => {
    const db = tenantDb([
      payment({ id: 'pay-own', tenant_id: TENANT }),
      payment({ id: 'pay-foreign', tenant_id: OTHER }),
    ])

    await expect(persist(db, ['pay-own', 'pay-foreign'])).rejects.toBeInstanceOf(PaymentClaimRejectedError)

    expect(db.tables.payments.every((row) => row.invoice_id == null)).toBe(true)
    expect(db.tables.invoices).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('rejects an already invoiced payment and keeps the existing link', async () => {
    const db = tenantDb([
      payment({ id: 'pay-own', tenant_id: TENANT, invoice_id: 'inv-existing', payment_status: 'invoiced' }),
    ])

    await expect(persist(db, ['pay-own'])).rejects.toBeInstanceOf(PaymentClaimRejectedError)

    expect(db.tables.payments[0].invoice_id).toBe('inv-existing')
    expect(db.tables.invoices).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('rolls back when a concurrent claim takes the payment after the preflight read', async () => {
    const db = tenantDb(
      [payment({ id: 'pay-own', tenant_id: TENANT })],
      {
        beforePaymentUpdate: () => {
          db.tables.payments[0].invoice_id = 'inv-winner'
          db.tables.payments[0].payment_status = 'invoiced'
        },
      },
    )

    await expect(persist(db, ['pay-own'])).rejects.toBeInstanceOf(PaymentClaimRejectedError)

    expect(db.tables.payments[0].invoice_id).toBe('inv-winner')
    expect(db.tables.invoices).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('releases a partial claim and restores the previous payment state', async () => {
    const db = tenantDb(
      [
        payment({ id: 'pay-a', tenant_id: TENANT, payment_status: 'open', payment_method: 'cash' }),
        payment({ id: 'pay-b', tenant_id: TENANT }),
      ],
      {
        beforePaymentUpdate: () => {
          const stolen = db.tables.payments.find((row) => row.id === 'pay-b')
          if (stolen && stolen.invoice_id == null) {
            stolen.invoice_id = 'inv-winner'
            stolen.payment_status = 'invoiced'
          }
        },
      },
    )

    await expect(persist(db, ['pay-a', 'pay-b'])).rejects.toBeInstanceOf(PaymentClaimRejectedError)

    const payA = db.tables.payments.find((row) => row.id === 'pay-a')
    const payB = db.tables.payments.find((row) => row.id === 'pay-b')
    expect(payA).toMatchObject({ invoice_id: null, payment_status: 'open', payment_method: 'cash' })
    expect(payB?.invoice_id).toBe('inv-winner')
    expect(db.tables.invoices).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
