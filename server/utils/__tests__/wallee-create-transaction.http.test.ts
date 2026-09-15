import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getWalleeConfigForTenant: vi.fn(async () => ({
    spaceId: 1,
    userId: 2,
    apiSecret: 'secret',
  })),
  getWalleeSDKConfig: vi.fn(() => ({})),
  transactionCreate: vi.fn(async () => ({ id: 999 })),
  transactionRead: vi.fn(),
  paymentPageUrl: vi.fn(async () => 'https://pay.example/page'),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: () => 'app.simy.ch',
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/wallee-config', () => ({
  getWalleeConfigForTenant: mocks.getWalleeConfigForTenant,
  getWalleeSDKConfig: mocks.getWalleeSDKConfig,
}))

vi.mock('wallee', () => ({
  Wallee: {
    api: {
      TransactionService: class {
        create = mocks.transactionCreate
        read = mocks.transactionRead
      },
      TransactionPaymentPageService: class {
        paymentPageUrl = mocks.paymentPageUrl
      },
    },
    model: {
      LineItemType: { PRODUCT: 'PRODUCT' },
    },
  },
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const PAY = '66666666-6666-6666-6666-666666666666'

type Handler = (event: object) => Promise<unknown>
const handlerPromise = import('~/server/api/wallee/create-transaction.post') as Promise<{ default: Handler }>

function paymentSupabase(payment: Record<string, unknown> | null) {
  return {
    from() {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = () => chain
      chain.delete = () => chain
      chain.maybeSingle = async () => ({ data: payment, error: payment ? null : { message: 'missing' } })
      return chain
    },
  }
}

describe('POST /api/wallee/create-transaction remaining after credit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function run(opts: {
    payment: Record<string, unknown>
    clientAmount: number
  }) {
    mocks.getSupabaseAdmin.mockReturnValue(paymentSupabase(opts.payment))
    mocks.readBody.mockResolvedValue({
      orderId: PAY,
      amount: opts.clientAmount,
      currency: 'CHF',
      customerEmail: 'a@example.com',
      customerName: 'Ada',
      description: 'Termin',
      tenantId: TENANT,
    })
    const { default: handler } = await handlerPromise
    return handler({})
  }

  const pendingPayment = {
    id: PAY,
    tenant_id: TENANT,
    total_amount_rappen: 10000,
    payment_status: 'pending',
    currency: 'CHF',
    wallee_transaction_id: null,
    wallee_space_id: null,
  }

  it('3. partial credit charges 60 CHF', async () => {
    const result = await run({
      payment: { ...pendingPayment, credit_used_rappen: 4000 },
      clientAmount: 60,
    })
    expect(result).toMatchObject({ success: true, transactionId: '999' })
    expect(mocks.transactionCreate).toHaveBeenCalledWith(1, expect.objectContaining({
      lineItems: [expect.objectContaining({ amountIncludingTax: 60 })],
    }))
  })

  it('4. no credit charges 100 CHF', async () => {
    await run({
      payment: { ...pendingPayment, credit_used_rappen: 0 },
      clientAmount: 100,
    })
    expect(mocks.transactionCreate).toHaveBeenCalledWith(1, expect.objectContaining({
      lineItems: [expect.objectContaining({ amountIncludingTax: 100 })],
    }))
  })

  it('5. full credit does not create a Wallee transaction', async () => {
    await expect(run({
      payment: { ...pendingPayment, credit_used_rappen: 10000 },
      clientAmount: 100,
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Ungültiger Zahlungsbetrag',
    })
    expect(mocks.transactionCreate).not.toHaveBeenCalled()
  })

  it('6. forged client amount cannot change the Wallee charge', async () => {
    await run({
      payment: { ...pendingPayment, credit_used_rappen: 4000 },
      clientAmount: 1,
    })
    expect(mocks.transactionCreate).toHaveBeenCalledWith(1, expect.objectContaining({
      lineItems: [expect.objectContaining({ amountIncludingTax: 60 })],
    }))
    mocks.transactionCreate.mockClear()
    await run({
      payment: { ...pendingPayment, credit_used_rappen: 4000 },
      clientAmount: 100,
    })
    expect(mocks.transactionCreate).toHaveBeenCalledWith(1, expect.objectContaining({
      lineItems: [expect.objectContaining({ amountIncludingTax: 60 })],
    }))
  })
})
