import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { applyStudentCreditDelta } from '~/server/utils/student-credit-ledger'
import {
  creditDeferredCashOverpayment,
  deferredCashOverpaymentKey,
} from '../staff-pos-deferred-overpayment'

vi.mock('~/server/utils/student-credit-ledger', () => ({
  applyStudentCreditDelta: vi.fn(),
}))

const tenantA = '11111111-1111-4111-8111-111111111111'
const tenantB = '22222222-2222-4222-8222-222222222222'
const studentA = '44444444-4444-4444-8444-444444444444'
const studentB = '55555555-5555-4555-8555-555555555555'
const paymentA = '33333333-3333-4333-8333-333333333333'
const paymentB = '66666666-6666-4666-8666-666666666666'
const actor = '77777777-7777-4777-8777-777777777777'

function deferred(overrides: Record<string, unknown> = {}) {
  return {
    id: paymentA,
    tenant_id: tenantA,
    user_id: studentA,
    payment_method: 'deferred',
    payment_status: 'completed',
    appointment_id: null,
    metadata: { source: 'staff_product_sale', fulfillment: 'deferred' },
    ...overrides,
  }
}

function supabaseWith(existing: { id: string; amount_rappen: number; user_id: string } | null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: existing, error: null }),
  }
  return { from: () => chain }
}

describe('deferred cash overpayment', () => {
  beforeEach(() => {
    applyStudentCreditDelta.mockReset()
    applyStudentCreditDelta.mockResolvedValue({
      balanceBeforeRappen: 0,
      balanceAfterRappen: 2000,
      transactionId: 'tx-1',
    })
  })

  it('credits CHF 20 once for a completed deferred sale', async () => {
    const result = await creditDeferredCashOverpayment({
      supabase: supabaseWith(null),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred()],
      amountRappen: 2000,
    })

    expect(result).toEqual({ creditedRappen: 2000, replayed: false })
    expect(applyStudentCreditDelta).toHaveBeenCalledTimes(1)
    expect(applyStudentCreditDelta.mock.calls[0][1]).toMatchObject({
      userId: studentA,
      tenantId: tenantA,
      deltaRappen: 2000,
      transactionType: 'deposit',
      referenceType: 'overpayment',
      referenceId: null,
      paymentMethod: 'cash',
      description: deferredCashOverpaymentKey([paymentA]),
    })
  })

  it('does not credit the same deferred overpayment again', async () => {
    const result = await creditDeferredCashOverpayment({
      supabase: supabaseWith({ id: 'tx-1', amount_rappen: 2000, user_id: studentA }),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred()],
      amountRappen: 2000,
    })

    expect(result).toEqual({ creditedRappen: 0, replayed: true })
    expect(applyStudentCreditDelta).not.toHaveBeenCalled()
  })

  it('rejects a second amount for the same deferred sale', async () => {
    await expect(creditDeferredCashOverpayment({
      supabase: supabaseWith({ id: 'tx-1', amount_rappen: 2000, user_id: studentA }),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred()],
      amountRappen: 3000,
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(applyStudentCreditDelta).not.toHaveBeenCalled()
  })

  it('rejects a pending sale, another tenant, and another student', async () => {
    await expect(creditDeferredCashOverpayment({
      supabase: supabaseWith(null),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred({ payment_status: 'pending' })],
      amountRappen: 2000,
    })).rejects.toBeInstanceOf(StaffProductSaleError)

    await expect(creditDeferredCashOverpayment({
      supabase: supabaseWith(null),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred({ tenant_id: tenantB })],
      amountRappen: 2000,
    })).rejects.toMatchObject({ statusCode: 404 })

    await expect(creditDeferredCashOverpayment({
      supabase: supabaseWith(null),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred(), deferred({ id: paymentB, user_id: studentB })],
      amountRappen: 2000,
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(applyStudentCreditDelta).not.toHaveBeenCalled()
  })

  it('rejects invoice and Wallee rows', async () => {
    await expect(creditDeferredCashOverpayment({
      supabase: supabaseWith(null),
      actorId: actor,
      actorTenantId: tenantA,
      payments: [deferred({ payment_method: 'wallee', metadata: { source: 'staff_product_sale', fulfillment: 'wallee' } })],
      amountRappen: 2000,
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(applyStudentCreditDelta).not.toHaveBeenCalled()
  })

  it('uses one stable key for the same deferred payments', () => {
    expect(deferredCashOverpaymentKey([paymentB, paymentA])).toBe(deferredCashOverpaymentKey([paymentA, paymentB]))
  })
})
