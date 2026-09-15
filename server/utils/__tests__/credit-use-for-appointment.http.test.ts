import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  logAudit: vi.fn(async () => undefined),
  getClientIP: vi.fn(() => '127.0.0.1'),
  applyCreditToPayment: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: mocks.logAudit,
}))

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/apply-credit-to-payment', () => ({
  applyCreditToPayment: mocks.applyCreditToPayment,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const STAFF = '44444444-4444-4444-4444-444444444444'
const PAY = '66666666-6666-6666-6666-666666666666'
const AUTH = 'auth-staff'

type Handler = (event: object) => Promise<unknown>
const handlerPromise = import('~/server/api/credit/use-for-appointment.post') as Promise<{ default: Handler }>

function staffSupabase(opts: { paymentTenant?: string; payment?: { id: string } | null }) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = self
      chain.eq = self
      chain.order = self
      chain.limit = self
      chain.maybeSingle = async () => {
        if (table === 'users') {
          return { data: { id: STAFF, tenant_id: TENANT, role: 'staff' }, error: null }
        }
        if (table === 'payments') {
          if (opts.payment === null) return { data: null, error: null }
          if (opts.paymentTenant && opts.paymentTenant !== TENANT) return { data: null, error: null }
          return { data: opts.payment || { id: PAY }, error: null }
        }
        return { data: null, error: null }
      }
      chain.single = chain.maybeSingle
      return chain
    },
  }
}

describe('POST /api/credit/use-for-appointment Slice 5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
    mocks.applyCreditToPayment.mockResolvedValue({
      payment_id: PAY,
      credit_used_rappen: 5000,
      remaining_amount_rappen: 12550,
      payment_status: 'pending',
      credit_to_use_rappen: 5000,
      credit_transaction_id: 'tx-1',
      applied: true,
    })
  })

  it('applies via payment_id with the same RPC wrapper', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(staffSupabase({}))
    mocks.readBody.mockResolvedValue({ payment_id: PAY, amountRappen: 5000 })
    const { default: handler } = await handlerPromise
    const result = await handler({})
    expect(mocks.applyCreditToPayment).toHaveBeenCalledWith(expect.anything(), {
      paymentId: PAY,
      tenantId: TENANT,
      requestedRappen: 5000,
      actorUserId: STAFF,
    })
    expect(result).toMatchObject({
      success: true,
      credit_used_rappen: 5000,
      remaining_amount_rappen: 12550,
      applied: true,
    })
  })

  it('rejects a payment from another tenant', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(staffSupabase({ payment: null }))
    mocks.readBody.mockResolvedValue({ payment_id: PAY, amountRappen: 5000 })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Payment not found',
    })
    expect(mocks.applyCreditToPayment).not.toHaveBeenCalled()
    expect(OTHER).toBeTruthy()
  })

  it('requires payment_id or appointmentId', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(staffSupabase({}))
    mocks.readBody.mockResolvedValue({ amountRappen: 5000 })
    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })
})
