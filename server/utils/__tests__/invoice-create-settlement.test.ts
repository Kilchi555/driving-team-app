import { describe, expect, it } from 'vitest'
import {
  canCreateInvoice,
  canRecordInvoiceSettlements,
  invoiceCreateOutstandingRappen,
  invoiceCreateQrAmountRappen,
  isOfflineSettlementMethod,
  isProviderSettlementMethod,
  isUuidV4,
  paymentStatusForPaidTotal,
  requireIdempotencyKey,
  sumSettlementRappen,
  validateLineSettlements,
} from '../invoice-create-settlement'

describe('authz helpers', () => {
  it('allows admin, staff, tenant_admin to create', () => {
    expect(canCreateInvoice('admin')).toBe(true)
    expect(canCreateInvoice('staff')).toBe(true)
    expect(canCreateInvoice('tenant_admin')).toBe(true)
    expect(canCreateInvoice('client')).toBe(false)
  })

  it('allows only admin/tenant_admin to settle lines', () => {
    expect(canRecordInvoiceSettlements('admin')).toBe(true)
    expect(canRecordInvoiceSettlements('tenant_admin')).toBe(true)
    expect(canRecordInvoiceSettlements('staff')).toBe(false)
  })
})

describe('payment method guards', () => {
  it('accepts offline methods only', () => {
    expect(isOfflineSettlementMethod('cash')).toBe(true)
    expect(isOfflineSettlementMethod('twint')).toBe(true)
    expect(isOfflineSettlementMethod('bank_transfer')).toBe(true)
    expect(isOfflineSettlementMethod('card_terminal')).toBe(true)
    expect(isOfflineSettlementMethod('wallee')).toBe(false)
  })

  it('rejects provider methods', () => {
    expect(isProviderSettlementMethod('wallee')).toBe(true)
    expect(isProviderSettlementMethod('online')).toBe(true)
    expect(isProviderSettlementMethod('cash')).toBe(false)
  })
})

describe('validateLineSettlements', () => {
  const base = {
    item_index: 0,
    payment_method: 'cash',
    line_total_rappen: 10000,
    amount_rappen: 10000,
  }

  it('returns empty for no settlements', () => {
    expect(validateLineSettlements([], { role: 'admin', itemCount: 2 })).toEqual([])
  })

  it('rejects staff settling lines', () => {
    expect(() => validateLineSettlements([base], { role: 'staff', itemCount: 1 }))
      .toThrow(/Admins/)
  })

  it('rejects wallee as completed-at-create', () => {
    expect(() => validateLineSettlements([{
      ...base,
      payment_method: 'wallee',
    }], { role: 'admin', itemCount: 1 })).toThrow(/Online/)
  })

  it('rejects partial line amounts', () => {
    expect(() => validateLineSettlements([{
      ...base,
      amount_rappen: 5000,
    }], { role: 'admin', itemCount: 1 })).toThrow(/vollständige/)
  })

  it('rejects duplicate item indexes', () => {
    expect(() => validateLineSettlements([base, { ...base }], { role: 'admin', itemCount: 2 }))
      .toThrow(/Doppelte/)
  })

  it('accepts mixed fully-paid lines for admin', () => {
    const out = validateLineSettlements([
      { ...base, item_index: 0, payment_method: 'cash' },
      { ...base, item_index: 2, payment_method: 'bank_transfer', payment_date: '2026-10-01' },
    ], { role: 'admin', itemCount: 3 })
    expect(out).toHaveLength(2)
    expect(out[0].payment_method).toBe('cash')
    expect(out[1].payment_method).toBe('bank_transfer')
    expect(sumSettlementRappen(out)).toBe(20000)
  })
})

describe('balances and QR', () => {
  it('computes outstanding', () => {
    expect(invoiceCreateOutstandingRappen(15000, 5000)).toBe(10000)
    expect(invoiceCreateOutstandingRappen(15000, 20000)).toBe(0)
  })

  it('QR uses outstanding; zero when fully paid', () => {
    expect(invoiceCreateQrAmountRappen(15000, 0)).toBe(15000)
    expect(invoiceCreateQrAmountRappen(15000, 5000)).toBe(10000)
    expect(invoiceCreateQrAmountRappen(15000, 15000)).toBe(0)
    expect(invoiceCreateQrAmountRappen(15000, 15000, 500)).toBe(0)
  })

  it('maps payment status', () => {
    expect(paymentStatusForPaidTotal(100, 0)).toBe('pending')
    expect(paymentStatusForPaidTotal(100, 40)).toBe('partial')
    expect(paymentStatusForPaidTotal(100, 100)).toBe('paid')
  })
})

describe('idempotency key', () => {
  it('requires UUID when settlements present', () => {
    expect(() => requireIdempotencyKey(null, true)).toThrow(/idempotency_key/)
    expect(isUuidV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(requireIdempotencyKey('550e8400-e29b-41d4-a716-446655440000', true))
      .toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('allows missing key when no settlements', () => {
    expect(requireIdempotencyKey(null, false)).toBeNull()
  })
})
