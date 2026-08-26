import { describe, expect, it } from 'vitest'
import {
  assessOnlinePaymentReceipt,
  receiptNumberForPayment,
} from '../online-payment-receipt'

describe('assessOnlinePaymentReceipt', () => {
  const base = {
    payment_status: 'completed',
    total_amount_rappen: 18000,
    metadata: {},
    customerEmail: 'kunde@example.com',
  }

  it('allows a completed paid payment with email', () => {
    expect(assessOnlinePaymentReceipt(base)).toEqual({ ok: true })
  })

  it('skips pending payments with a clear reason', () => {
    const result = assessOnlinePaymentReceipt({ ...base, payment_status: 'pending' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOT_COMPLETED')
      expect(result.message).toContain('pending')
    }
  })

  it('is idempotent once receipt_sent_at is set', () => {
    const result = assessOnlinePaymentReceipt({
      ...base,
      metadata: { receipt_sent_at: '2026-08-25T08:00:00.000Z' },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ALREADY_SENT')
  })

  it('skips zero amounts', () => {
    const result = assessOnlinePaymentReceipt({ ...base, total_amount_rappen: 0 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NO_AMOUNT')
  })

  it('skips missing email with a clear message', () => {
    const result = assessOnlinePaymentReceipt({ ...base, customerEmail: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NO_EMAIL')
      expect(result.message).toContain('E-Mail')
    }
  })
})

describe('receiptNumberForPayment', () => {
  it('builds a short stable number from the payment id', () => {
    expect(receiptNumberForPayment('a1b2c3d4-e5f6-7890-abcd-ef1234567890'))
      .toBe('Q-A1B2C3D4E5')
  })
})
