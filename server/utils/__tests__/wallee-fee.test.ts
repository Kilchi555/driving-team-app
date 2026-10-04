import { describe, expect, it } from 'vitest'
import {
  WALLEE_FEE_PUBLIC_LABEL,
  WALLEE_TWINT_PAYMENT_METHOD_ID,
  isWalleeCollectedPayment,
  summarizeWalleeFees,
  walleeFeeKindFromMetadata,
  walleeFeeKindFromPaymentMethodId,
  walleeFeeKindFromTransaction,
  walleeFeeLabel,
  walleeFeeRappen,
  walleeNetRappen,
} from '../../../utils/wallee-fee'

const TWINT = WALLEE_TWINT_PAYMENT_METHOD_ID

function txWithMethod(paymentMethod: number | string) {
  return {
    paymentConnectorConfiguration: {
      paymentMethodConfiguration: { paymentMethod },
    },
  }
}

describe('walleeFeeRappen standard 1.35%', () => {
  it('CHF 100 is 135 rappen', () => {
    expect(walleeFeeRappen(10000)).toBe(135)
    expect(walleeFeeRappen(10000, 'standard')).toBe(135)
  })

  it('CHF 200 is 270 rappen', () => {
    expect(walleeFeeRappen(20000, 'standard')).toBe(270)
  })

  it('rounds half a rappen up and stays below the half-rappen boundary', () => {
    expect(walleeFeeRappen(1000, 'standard')).toBe(14)
    expect(walleeFeeRappen(500, 'standard')).toBe(7)
    expect(walleeFeeRappen(37, 'standard')).toBe(0)
    expect(walleeFeeRappen(38, 'standard')).toBe(1)
  })

  it('ignores negative and empty amounts', () => {
    expect(walleeFeeRappen(0)).toBe(0)
    expect(walleeFeeRappen(-500)).toBe(0)
    expect(walleeFeeRappen(Number.NaN, 'twint')).toBe(0)
  })
})

describe('walleeFeeRappen TWINT 1.3%', () => {
  it('CHF 100 is 130 rappen', () => {
    expect(walleeFeeRappen(10000, 'twint')).toBe(130)
  })

  it('CHF 200 is 260 rappen', () => {
    expect(walleeFeeRappen(20000, 'twint')).toBe(260)
  })

  it('rounds half a rappen up', () => {
    expect(walleeFeeRappen(500, 'twint')).toBe(7)
    expect(walleeFeeRappen(1000, 'twint')).toBe(13)
  })
})

describe('historical 1.7% display', () => {
  it('keeps the previous rappen formula for unstamped payments', () => {
    expect(walleeFeeRappen(10000, 'legacy')).toBe(170)
    expect(walleeFeeRappen(3333, 'legacy')).toBe(57)
    expect(walleeNetRappen(10000, 'legacy')).toBe(9830)
  })
})

describe('walleeNetRappen', () => {
  it('subtracts the active standard fee from gross', () => {
    expect(walleeNetRappen(10000)).toBe(9865)
    expect(walleeNetRappen(10000, 'twint')).toBe(9870)
  })
})

describe('TWINT detection from the Wallee transaction', () => {
  it('uses the global TWINT payment method id', () => {
    expect(walleeFeeKindFromPaymentMethodId(TWINT)).toBe('twint')
    expect(walleeFeeKindFromPaymentMethodId(1)).toBe('standard')
    expect(walleeFeeKindFromPaymentMethodId(null)).toBeNull()
    expect(walleeFeeKindFromPaymentMethodId(0)).toBeNull()
  })

  it('reads the method id from the connector configuration', () => {
    expect(walleeFeeKindFromTransaction(txWithMethod(TWINT))).toBe('twint')
    expect(walleeFeeKindFromTransaction(txWithMethod(String(TWINT)))).toBe('twint')
    expect(walleeFeeKindFromTransaction(txWithMethod(99))).toBe('standard')
    expect(walleeFeeKindFromTransaction({ paymentConnectorConfiguration: 42 })).toBeNull()
    expect(walleeFeeKindFromTransaction(null)).toBeNull()
  })

  it('treats a missing stored kind as the historical rate', () => {
    expect(walleeFeeKindFromMetadata(null)).toBe('legacy')
    expect(walleeFeeKindFromMetadata({})).toBe('legacy')
    expect(walleeFeeKindFromMetadata({ wallee_fee_kind: 'twint' })).toBe('twint')
    expect(walleeFeeKindFromMetadata({ wallee_fee_kind: 'standard' })).toBe('standard')
    expect(walleeFeeKindFromMetadata({ wallee_fee_kind: 'client-twint' })).toBe('legacy')
  })
})

describe('labels', () => {
  it('publishes both active rates and keeps 1.7% for historical rows only', () => {
    expect(WALLEE_FEE_PUBLIC_LABEL).toBe('1,35 % (TWINT 1,3 %)')
    expect(walleeFeeLabel('standard')).toBe('1,35 %')
    expect(walleeFeeLabel('twint')).toBe('1,3 %')
    expect(walleeFeeLabel('legacy')).toBe('1,7 %')
  })
})

describe('isWalleeCollectedPayment', () => {
  it('accepts completed Wallee payments', () => {
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'completed',
    })).toBe(true)
    expect(isWalleeCollectedPayment({
      payment_provider: 'wallee',
      payment_status: 'paid',
    })).toBe(true)
  })

  it('rejects cash, QR invoice, offline TWINT, credit, pending and refunds', () => {
    expect(isWalleeCollectedPayment({
      payment_method: 'cash',
      payment_status: 'completed',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'invoice',
      payment_status: 'completed',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'twint',
      payment_status: 'completed',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'credit',
      payment_status: 'completed',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'pending',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'failed',
    })).toBe(false)
    expect(isWalleeCollectedPayment({
      payment_method: 'wallee',
      payment_status: 'completed',
      refunded_at: '2026-08-01T00:00:00.000Z',
    })).toBe(false)
  })
})

describe('summarizeWalleeFees', () => {
  it('sums each payment at its own kind', () => {
    const summary = summarizeWalleeFees([
      { total_amount_rappen: 10000, fee_kind: 'standard' },
      { total_amount_rappen: 20000, fee_kind: 'twint' },
      { total_amount_rappen: 10000, fee_kind: 'legacy' },
    ])
    expect(summary.count).toBe(3)
    expect(summary.gross_rappen).toBe(40000)
    expect(summary.fee_rappen).toBe(135 + 260 + 170)
    expect(summary.net_rappen).toBe(40000 - (135 + 260 + 170))
  })

  it('uses the active standard rate when a new row has no explicit kind', () => {
    const summary = summarizeWalleeFees([
      { total_amount_rappen: 10000 },
      { total_amount_rappen: 3333 },
    ])
    expect(summary.fee_rappen).toBe(135 + 45)
    expect(summary.net_rappen).toBe(13333 - 180)
  })
})
