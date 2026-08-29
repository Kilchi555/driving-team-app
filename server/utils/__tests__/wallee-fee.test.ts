import { describe, expect, it } from 'vitest'
import {
  isWalleeCollectedPayment,
  summarizeWalleeFees,
  walleeFeeRappen,
  walleeNetRappen,
} from '../../../utils/wallee-fee'

describe('walleeFeeRappen', () => {
  it('is 1.7% of CHF 100', () => {
    expect(walleeFeeRappen(10000)).toBe(170)
  })

  it('rounds to nearest rappen', () => {
    expect(walleeFeeRappen(3333)).toBe(57)
  })

  it('ignores negative and empty amounts', () => {
    expect(walleeFeeRappen(0)).toBe(0)
    expect(walleeFeeRappen(-500)).toBe(0)
  })
})

describe('walleeNetRappen', () => {
  it('subtracts the fee from gross', () => {
    expect(walleeNetRappen(10000)).toBe(9830)
  })
})

describe('isWalleeCollectedPayment', () => {
  it('accepts completed Wallee payments', () => {
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'completed',
    })).toBe(true)
  })

  it('rejects cash, pending and refunded rows', () => {
    expect(isWalleeCollectedPayment({
      payment_method: 'cash',
      payment_status: 'completed',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'pending',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'completed',
      refunded_at: '2026-08-01T00:00:00.000Z',
    })).toBe(false)
  })
})

describe('summarizeWalleeFees', () => {
  it('sums per-payment fees instead of percent of the total', () => {
    const summary = summarizeWalleeFees([
      { total_amount_rappen: 10000 },
      { total_amount_rappen: 3333 },
    ])
    expect(summary.count).toBe(2)
    expect(summary.gross_rappen).toBe(13333)
    expect(summary.fee_rappen).toBe(227)
    expect(summary.net_rappen).toBe(13106)
  })
})
