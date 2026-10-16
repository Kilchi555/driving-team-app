import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  releaseInvoicePayments: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/release-invoice-payments', () => ({
  releaseInvoicePayments: mocks.releaseInvoicePayments,
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER_TENANT = '22222222-2222-2222-2222-222222222222'
const INVOICE = '33333333-3333-3333-3333-333333333333'
const AUTH = 'auth-admin'

type Profile = { id: string; tenant_id: string | null; role: string }
type InvoiceRow = { id: string; tenant_id: string; status: string; payment_status: string }

function createSupabase(opts: {
  profile: Profile | null
  invoice: InvoiceRow | null
  updates: Record<string, unknown>[]
}) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      let op: 'select' | 'update' = 'select'
      let payload: Record<string, unknown> | null = null
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          filters[col] = val
          return chain
        },
        update: (next: Record<string, unknown>) => {
          op = 'update'
          payload = next
          opts.updates.push(next)
          return chain
        },
        maybeSingle: async () => resolve(),
        single: async () => resolve(),
      }

      function resolve() {
        if (table === 'users') {
          if (!opts.profile || filters.auth_user_id !== AUTH) {
            return { data: null, error: { message: 'not found' } }
          }
          return { data: opts.profile, error: null }
        }
        if (table === 'invoices') {
          if (!opts.invoice || filters.id !== opts.invoice.id) {
            return { data: null, error: op === 'update' ? { message: 'not found' } : null }
          }
          if (filters.tenant_id && filters.tenant_id !== opts.invoice.tenant_id) {
            return { data: null, error: { message: 'not found' } }
          }
          if (op === 'update') {
            return { data: { ...opts.invoice, ...payload }, error: null }
          }
          return { data: { id: opts.invoice.id, tenant_id: opts.invoice.tenant_id }, error: null }
        }
        if (table === 'invoices_with_details') {
          if (!opts.invoice || filters.id !== opts.invoice.id) {
            return { data: null, error: { message: 'not found' } }
          }
          if (filters.tenant_id && filters.tenant_id !== opts.invoice.tenant_id) {
            return { data: null, error: { message: 'not found' } }
          }
          return { data: { ...opts.invoice, customer_first_name: 'Ada' }, error: null }
        }
        return { data: null, error: { message: `unexpected table ${table}` } }
      }

      return chain
    },
  }
}

const handlerPromise = import('~/server/api/invoices/update.post') as Promise<{
  default: (event: unknown) => Promise<{ success: boolean; data: InvoiceRow }>
}>

async function run(opts: {
  role?: string
  tenantId?: string | null
  auth?: { id: string } | null
  invoice?: InvoiceRow | null
  body?: Record<string, unknown>
}) {
  const updates: Record<string, unknown>[] = []
  const invoice = opts.invoice === undefined
    ? { id: INVOICE, tenant_id: TENANT, status: 'paid', payment_status: 'paid' }
    : opts.invoice
  mocks.getAuthenticatedUser.mockResolvedValue(
    opts.auth === undefined ? { id: AUTH } : opts.auth,
  )
  mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
    profile: opts.auth === null
      ? null
      : {
          id: 'staff-1',
          tenant_id: opts.tenantId === undefined ? TENANT : opts.tenantId,
          role: opts.role || 'admin',
        },
    invoice,
    updates,
  }))
  mocks.readBody.mockResolvedValue(opts.body || {
    invoice_id: INVOICE,
    updates: { status: 'sent', sent_at: '2026-10-15T11:00:00.000Z' },
  })
  const { default: handler } = await handlerPromise
  const result = await handler({})
  return { result, updates }
}

describe('POST /api/invoices/update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.releaseInvoicePayments.mockResolvedValue({ paymentsReleased: 0 })
  })

  it('does not write when payment_status is rejected', async () => {
    const updates: Record<string, unknown>[] = []
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
      profile: { id: 'staff-1', tenant_id: TENANT, role: 'admin' },
      invoice: { id: INVOICE, tenant_id: TENANT, status: 'paid', payment_status: 'paid' },
      updates,
    }))
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE,
      updates: {
        payment_status: 'pending',
        status: 'sent',
        sent_at: '2026-10-15T11:00:00.000Z',
      },
    })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(updates).toEqual([])
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it('rejects paid_amount_rappen and paid_at before any update', async () => {
    const updates: Record<string, unknown>[] = []
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
      profile: { id: 'staff-1', tenant_id: TENANT, role: 'staff' },
      invoice: { id: INVOICE, tenant_id: TENANT, status: 'paid', payment_status: 'paid' },
      updates,
    }))
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE,
      updates: { paid_amount_rappen: 0, paid_at: '2026-10-15T11:00:00.000Z' },
    })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining('paid_amount_rappen'),
    })
    expect(updates).toEqual([])
  })

  it('rejects tenant, owner, and total fields with those names in the error', async () => {
    const updates: Record<string, unknown>[] = []
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
      profile: { id: 'staff-1', tenant_id: TENANT, role: 'admin' },
      invoice: { id: INVOICE, tenant_id: TENANT, status: 'sent', payment_status: 'pending' },
      updates,
    }))
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE,
      updates: {
        tenant_id: OTHER_TENANT,
        user_id: '44444444-4444-4444-4444-444444444444',
        total_amount_rappen: 1,
      },
    })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringMatching(/tenant_id/),
    })
    expect(updates).toEqual([])
  })

  it('marks an invoice sent without touching payment fields', async () => {
    const { result, updates } = await run({
      body: {
        invoice_id: INVOICE,
        updates: { status: 'sent', sent_at: '2026-10-15T11:00:00.000Z' },
      },
    })
    expect(result.success).toBe(true)
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({
      status: 'sent',
      sent_at: '2026-10-15T11:00:00.000Z',
    })
    expect(updates[0]).not.toHaveProperty('payment_status')
    expect(updates[0]).not.toHaveProperty('paid_amount_rappen')
    expect(updates[0]).not.toHaveProperty('paid_at')
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it('cancels an invoice and then releases non-settled payments', async () => {
    const { result, updates } = await run({
      body: {
        invoice_id: INVOICE,
        updates: { status: 'cancelled', notes: 'Irrtum' },
      },
    })
    expect(result.success).toBe(true)
    expect(updates[0]).toMatchObject({ status: 'cancelled', notes: 'Irrtum' })
    expect(mocks.releaseInvoicePayments).toHaveBeenCalledTimes(1)
    expect(mocks.releaseInvoicePayments.mock.calls[0][1]).toBe(INVOICE)
  })

  it('saves the preview billing address', async () => {
    const { updates } = await run({
      body: {
        invoice_id: INVOICE,
        updates: {
          billing_contact_person: null,
          billing_company_name: null,
          billing_street: 'Weg 1',
          billing_zip: '8000',
          billing_city: 'Zürich',
          billing_email: 'kunde@example.ch',
        },
      },
    })
    expect(updates[0]).toMatchObject({
      billing_street: 'Weg 1',
      billing_email: 'kunde@example.ch',
    })
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it('stores billing_street_number, including an explicit empty value', async () => {
    const cleared = await run({
      body: {
        invoice_id: INVOICE,
        updates: {
          billing_street: 'Bahnhofstrasse',
          billing_street_number: '',
          billing_zip: '8000',
          billing_city: 'Zürich',
        },
      },
    })
    expect(cleared.updates).toHaveLength(1)
    expect(cleared.updates[0].billing_street).toBe('Bahnhofstrasse')
    expect(cleared.updates[0].billing_street_number).toBe('')

    const suffix = await run({
      body: {
        invoice_id: INVOICE,
        updates: {
          billing_street: 'Bahnhofstrasse',
          billing_street_number: '12a',
        },
      },
    })
    expect(suffix.updates[0].billing_street_number).toBe('12a')
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it('does not write when a house number is combined with payment_status', async () => {
    const updates: Record<string, unknown>[] = []
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
      profile: { id: 'staff-1', tenant_id: TENANT, role: 'admin' },
      invoice: { id: INVOICE, tenant_id: TENANT, status: 'sent', payment_status: 'pending' },
      updates,
    }))
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE,
      updates: {
        billing_street_number: '12',
        payment_status: 'paid',
      },
    })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining('payment_status'),
    })
    expect(updates).toEqual([])
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it('denies a cross-tenant invoice without writing', async () => {
    const updates: Record<string, unknown>[] = []
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
      profile: { id: 'staff-1', tenant_id: TENANT, role: 'admin' },
      invoice: { id: INVOICE, tenant_id: OTHER_TENANT, status: 'paid', payment_status: 'paid' },
      updates,
    }))
    mocks.readBody.mockResolvedValue({
      invoice_id: INVOICE,
      updates: { status: 'sent', sent_at: '2026-10-15T11:00:00.000Z' },
    })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied',
    })
    expect(updates).toEqual([])
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it.each(['client', 'tenant_admin', 'super_admin', 'accountant'])(
    'denies role %s',
    async (role) => {
      const updates: Record<string, unknown>[] = []
      mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
      mocks.getSupabaseAdmin.mockReturnValue(createSupabase({
        profile: { id: 'staff-1', tenant_id: TENANT, role },
        invoice: { id: INVOICE, tenant_id: TENANT, status: 'paid', payment_status: 'paid' },
        updates,
      }))
      mocks.readBody.mockResolvedValue({
        invoice_id: INVOICE,
        updates: { payment_status: 'pending', status: 'cancelled' },
      })
      const { default: handler } = await handlerPromise
      await expect(handler({})).rejects.toMatchObject({ statusCode: 403, statusMessage: 'Forbidden' })
      expect(updates).toEqual([])
      expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
    },
  )

  it('denies an unauthenticated caller', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401, statusMessage: 'Unauthorized' })
    expect(mocks.releaseInvoicePayments).not.toHaveBeenCalled()
  })

  it('allows staff to send an invoice', async () => {
    const { result, updates } = await run({
      role: 'staff',
      body: {
        invoice_id: INVOICE,
        updates: { status: 'sent', sent_at: '2026-10-15T11:00:00.000Z' },
      },
    })
    expect(result.success).toBe(true)
    expect(updates[0].status).toBe('sent')
  })
})
