import { describe, expect, it } from 'vitest'
import {
  allocateCreditAcrossDues,
  applyRequestedStudentCredit,
  applyStudentCreditToPayments,
  availableWalletRappen,
  remainingDueRappen,
} from '../apply-student-credit'

describe('allocateCreditAcrossDues', () => {
  it('covers cheapest open dues first', () => {
    const allocations = allocateCreditAcrossDues(
      [
        { id: 'a', due_rappen: 8000 },
        { id: 'b', due_rappen: 3000 },
        { id: 'c', due_rappen: 5000 },
      ],
      6000
    )

    expect(allocations).toEqual([
      { payment_id: 'b', apply_rappen: 3000, fully_covered: true },
      { payment_id: 'c', apply_rappen: 3000, fully_covered: false },
    ])
  })

  it('covers everything when wallet is large enough', () => {
    const allocations = allocateCreditAcrossDues(
      [
        { id: 'a', due_rappen: 2000 },
        { id: 'b', due_rappen: 1500 },
      ],
      10000
    )
    expect(allocations.every(a => a.fully_covered)).toBe(true)
    expect(allocations.reduce((s, a) => s + a.apply_rappen, 0)).toBe(3500)
  })

  it('skips zero dues', () => {
    expect(allocateCreditAcrossDues([{ id: 'a', due_rappen: 0 }], 5000)).toEqual([])
  })
})

describe('remainingDueRappen', () => {
  it('subtracts already used credit and partial cash', () => {
    expect(remainingDueRappen({
      id: 'p',
      user_id: 'u',
      total_amount_rappen: 10000,
      credit_used_rappen: 2000,
      amount_paid_rappen: 3000,
      payment_status: 'partial',
    })).toBe(5000)
  })

  it('is zero when credit already covers the payment', () => {
    expect(remainingDueRappen({
      id: 'p',
      user_id: 'u',
      total_amount_rappen: 8000,
      credit_used_rappen: 8000,
      payment_status: 'completed',
    })).toBe(0)
  })
})

describe('availableWalletRappen', () => {
  it('subtracts pending withdrawals and never goes negative', () => {
    expect(availableWalletRappen({ balance_rappen: 5000, pending_withdrawal_rappen: 2000 })).toBe(3000)
    expect(availableWalletRappen({ balance_rappen: 1000, pending_withdrawal_rappen: 4000 })).toBe(0)
    expect(availableWalletRappen(null)).toBe(0)
  })

  it('process-path freeze: deduct available only, leave frozen on the row', () => {
    const row = { balance_rappen: 10000, pending_withdrawal_rappen: 3000 }
    const available = availableWalletRappen(row)
    const deduct = Math.min(available, 7000)
    expect(available).toBe(7000)
    expect(deduct).toBe(7000)
    expect(row.balance_rappen - deduct).toBe(3000)
  })
})

describe('applyStudentCreditToPayments', () => {
  it('is a no-op when apply is false', async () => {
    const result = await applyStudentCreditToPayments({
      supabase: { from: () => { throw new Error('should not touch the database') } },
      tenantId: 't',
      actorUserId: 'staff',
      studentUserId: 'u',
      payments: [{ id: 'p', user_id: 'u', total_amount_rappen: 5000, payment_status: 'pending' }],
      apply: false,
    })
    expect(result).toEqual({
      credit_used_rappen: 0,
      credit_remaining_rappen: 0,
      allocations: [],
      fully_covered_payment_ids: [],
      remaining_payment_ids: ['p'],
      applied_by_payment_id: {},
    })
  })
})

describe('applyRequestedStudentCredit', () => {
  it('skips the wallet when the client opts out', async () => {
    const result = await applyRequestedStudentCredit({
      supabase: { from: () => { throw new Error('should not touch the database') } },
      tenantId: 't',
      actorUserId: 'u',
      studentUserId: 'u',
      payment: { id: 'p', user_id: 'u', total_amount_rappen: 9000, payment_status: 'pending' },
      apply: false,
    })
    expect(result).toEqual({ remaining_due_rappen: 9000, applied_rappen: 0 })
  })
})

describe('refundStudentCreditFromPayment', () => {
  it('is a no-op when no credit was used', async () => {
    const { refundStudentCreditFromPayment } = await import('../apply-student-credit')
    const refunded = await refundStudentCreditFromPayment({
      supabase: { from: () => { throw new Error('should not touch the database') } },
      tenantId: 't',
      payment: { id: 'p', user_id: 'u', credit_used_rappen: 0 },
    })
    expect(refunded).toBe(0)
  })
})
