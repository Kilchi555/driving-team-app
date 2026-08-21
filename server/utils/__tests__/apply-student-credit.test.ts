import { describe, expect, it } from 'vitest'
import { allocateCreditAcrossDues, remainingDueRappen } from '../apply-student-credit'

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
})
