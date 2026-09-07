import { describe, expect, it, vi } from 'vitest'
import {
  CHECKOUT_STATUS,
  classifyWalleeCreateFailure,
  checkoutBlocksHoldRelease,
  paymentMerchantReference,
  runPaymentCheckoutCreate,
  type PaymentCheckoutDeps,
} from '../wallee-checkout-claim'
import { BOOKING_ERROR } from '../booking-errors'

function deps(overrides: Partial<PaymentCheckoutDeps> & Pick<PaymentCheckoutDeps, 'claim'>): PaymentCheckoutDeps {
  return {
    persist: vi.fn(async ({ transactionId }) => ({ outcome: 'created', wallee_transaction_id: transactionId })),
    markRecovery: vi.fn(async () => {}),
    releaseIdle: vi.fn(async () => {}),
    search: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'tx-1', paymentPageUrl: 'https://pay.example/1' })),
    ...overrides,
  }
}

describe('paymentMerchantReference', () => {
  it('is exactly payment-{uuid}', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(paymentMerchantReference(id)).toBe(`payment-${id}`)
  })
})

describe('classifyWalleeCreateFailure', () => {
  it('treats timeouts and 5xx as unknown', () => {
    expect(classifyWalleeCreateFailure({ message: 'timeout' })).toBe('unknown')
    expect(classifyWalleeCreateFailure({ statusCode: 504 })).toBe('unknown')
    expect(classifyWalleeCreateFailure({ code: 'ECONNRESET' })).toBe('unknown')
  })

  it('treats 4xx validation as rejected', () => {
    expect(classifyWalleeCreateFailure({ statusCode: 400, message: 'invalid line item' })).toBe('rejected')
    expect(classifyWalleeCreateFailure({ statusCode: 422 })).toBe('rejected')
  })
})

describe('checkoutBlocksHoldRelease', () => {
  it('blocks creating, recovery_pending, and existing ids', () => {
    expect(checkoutBlocksHoldRelease({ checkout_status: CHECKOUT_STATUS.creating })).toBe(true)
    expect(checkoutBlocksHoldRelease({ checkout_status: CHECKOUT_STATUS.recovery_pending })).toBe(true)
    expect(checkoutBlocksHoldRelease({ wallee_transaction_id: '9' })).toBe(true)
    expect(checkoutBlocksHoldRelease({ checkout_status: CHECKOUT_STATUS.idle })).toBe(false)
  })
})

describe('runPaymentCheckoutCreate', () => {
  const ids = { paymentId: 'p1', tenantId: 't1' }

  it('reuses an existing transaction without create', async () => {
    const create = vi.fn()
    const result = await runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'reuse',
        wallee_transaction_id: 'existing',
        payment_status: 'pending',
      }),
      create,
    }))
    expect(result.transactionId).toBe('existing')
    expect(result.reused).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('serializes a parallel in-progress claim', async () => {
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({ outcome: 'in_progress', payment_status: 'pending' }),
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.CHECKOUT_IN_PROGRESS } })
  })

  it('creates only for a fresh claim owner after search miss', async () => {
    const create = vi.fn(async () => ({ id: 'tx-new', paymentPageUrl: 'https://pay.example/new' }))
    const result = await runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
        checkout_claim_token: 'tok',
        checkout_merchant_reference: 'payment-p1',
      }),
      create,
    }))
    expect(create).toHaveBeenCalledTimes(1)
    expect(result.transactionId).toBe('tx-new')
    expect(result.reused).toBe(false)
  })

  it('does not create when search finds a transaction after crash', async () => {
    const create = vi.fn()
    const persist = vi.fn(async ({ transactionId }) => ({ outcome: 'created', wallee_transaction_id: transactionId }))
    const result = await runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
        checkout_merchant_reference: 'payment-p1',
      }),
      search: async () => [{ id: 'tx-recovered', state: 'PENDING' }],
      persist,
      create,
    }))
    expect(create).not.toHaveBeenCalled()
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'tx-recovered' }))
    expect(result.recovered).toBe(true)
  })

  it('does not create on recovery_pending even when search misses', async () => {
    const create = vi.fn()
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'recovery',
        allow_create: false,
        payment_status: 'pending',
        checkout_status: 'recovery_pending',
      }),
      search: async () => [],
      create,
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING } })
    expect(create).not.toHaveBeenCalled()
  })

  it('marks recovery_pending on timeout and does not retry create', async () => {
    const markRecovery = vi.fn(async () => {})
    const create = vi.fn(async () => { throw { message: 'timeout of 25000ms exceeded' } })
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
        checkout_claim_token: 'tok',
      }),
      create,
      markRecovery,
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING } })
    expect(markRecovery).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('releases to idle on a definite 400 reject before retry is possible', async () => {
    const releaseIdle = vi.fn(async () => {})
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
        checkout_claim_token: 'tok',
      }),
      create: async () => { throw { statusCode: 400, message: 'bad request' } },
      releaseIdle,
    }))).rejects.toMatchObject({ statusCode: 400 })
    expect(releaseIdle).toHaveBeenCalledTimes(1)
  })

  it('marks recovery when persist would be skipped because create returned no id', async () => {
    const markRecovery = vi.fn(async () => {})
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
        checkout_claim_token: 'tok',
      }),
      create: async () => ({ id: '' }),
      markRecovery,
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING } })
    expect(markRecovery).toHaveBeenCalled()
  })

  it('keeps the first persisted id on a persist conflict', async () => {
    const result = await runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
      }),
      create: async () => ({ id: 'tx-new' }),
      persist: async () => ({ outcome: 'conflict', wallee_transaction_id: 'tx-old' }),
    }))
    expect(result.transactionId).toBe('tx-old')
    expect(result.reused).toBe(true)
  })

  it('blocks cancelled appointments before create', async () => {
    const create = vi.fn()
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'allow_create',
        allow_create: true,
        payment_status: 'pending',
        appointment_id: 'a1',
      }),
      loadAppointmentStatus: async () => 'cancelled',
      create,
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.APPOINTMENT_CANCELLED } })
    expect(create).not.toHaveBeenCalled()
  })

  it('blocks completed and authorized payments', async () => {
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({ outcome: 'blocked', payment_status: 'completed' }),
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.PAYMENT_ALREADY_COMPLETED } })
  })

  it('allows only one create when three callers race and only one gets the claim', async () => {
    const create = vi.fn(async () => ({ id: 'only-one' }))
    const claims: Array<'allow_create' | 'in_progress'> = ['allow_create', 'in_progress', 'in_progress']
    const results = await Promise.allSettled(claims.map((outcome) => runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome,
        allow_create: outcome === 'allow_create',
        payment_status: 'pending',
        checkout_claim_token: outcome === 'allow_create' ? 'tok' : null,
      }),
      create,
    }))))
    const fulfilled = results.filter((r): r is PromiseFulfilledResult<{ transactionId: string }> => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(fulfilled[0].value.transactionId).toBe('only-one')
    expect(rejected).toHaveLength(2)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('does not create for a different booking key on the same payment in recovery', async () => {
    const create = vi.fn()
    await expect(runPaymentCheckoutCreate(ids, deps({
      claim: async () => ({
        outcome: 'recovery',
        allow_create: false,
        payment_status: 'pending',
      }),
      create,
    }))).rejects.toMatchObject({ data: { error: BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING } })
    expect(create).not.toHaveBeenCalled()
  })
})
