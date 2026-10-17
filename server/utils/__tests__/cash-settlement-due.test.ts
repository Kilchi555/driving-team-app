import { describe, expect, it } from 'vitest'
import { cashSettlementDueRappen } from '~/server/utils/cash-settlement-due'
import { settlementFailure } from '~/server/utils/payment-settlement'

describe('cash settlement due', () => {
  it('treats a completed payment as already settled', () => {
    expect(cashSettlementDueRappen({
      total_amount_rappen: 5000,
      amount_paid_rappen: 5000,
      payment_status: 'completed',
    })).toEqual({ fullDue: 5000, alreadyPaid: 5000, remaining: 0 })
  })

  it('still subtracts only a partial amount_paid_rappen', () => {
    expect(cashSettlementDueRappen({
      total_amount_rappen: 5000,
      amount_paid_rappen: 2000,
      payment_status: 'partial',
    }).remaining).toBe(3000)
  })

  it('does not treat an open payment as already paid', () => {
    expect(cashSettlementDueRappen({
      total_amount_rappen: 5000,
      amount_paid_rappen: 5000,
      payment_status: 'pending',
    }).remaining).toBe(5000)
  })
})

describe('settlement RPC failure mapping', () => {
  it('accepts a successful payload and rejects null', () => {
    expect(settlementFailure(null, { ok: true })).toBeNull()
    expect(settlementFailure(null, null)?.statusCode).toBe(500)
    expect(settlementFailure({ message: 'invoice_not_found' }, null)?.statusCode).toBe(404)
    expect(settlementFailure({ message: 'duplicate_bank_import' }, null)?.statusCode).toBe(409)
  })
})
