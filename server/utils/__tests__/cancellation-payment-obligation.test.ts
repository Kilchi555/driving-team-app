import { describe, expect, it } from 'vitest'
import {
  planCancellationObligationChange,
  type ObligationLedgerEntry,
  type ObligationPayment,
} from '../cancellation-payment-obligation'

const NOW = '2026-09-30T10:00:00.000Z'

function paid(overrides: Partial<ObligationPayment> = {}): ObligationPayment {
  return {
    id: 'pay-1',
    payment_status: 'completed',
    total_amount_rappen: 9500,
    credit_used_rappen: 0,
    amount_paid_rappen: 0,
    refunded_amount_rappen: 0,
    metadata: {},
    ...overrides,
  }
}

function ledger(amount: number, type = 'cancellation', extra: Partial<ObligationLedgerEntry> = {}): ObligationLedgerEntry {
  return {
    transaction_type: type,
    amount_rappen: amount,
    balance_before_rappen: 0,
    balance_after_rappen: amount,
    ...extra,
  }
}

describe('planCancellationObligationChange', () => {
  it('credits a paid late cancellation in full when the charge is waived', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 100,
      mustPay: false,
      note: 'Kulanz',
      payments: [paid()],
      ledger: [],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.noop).toBe(false)
    expect(plan.nextChargePercentage).toBe(0)
    expect(plan.creditDeltaRappen).toBe(9500)
    expect(plan.paymentUpdates[0]).toMatchObject({
      payment_status: 'refunded',
      refunded_at: NOW,
    })
    expect(plan.summary).toContain('CHF 95.00')
    expect(plan.ledgerNote).toContain('prev_charge=100')
    expect(plan.ledgerNote).toContain('Kulanz')
  })

  it('does not credit again when the waiver was already posted', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 100,
      mustPay: false,
      payments: [paid({ payment_status: 'refunded' })],
      ledger: [ledger(9500, 'cancellation_charge_waiver', { notes: 'prev_charge=100; Kulanz' })],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creditDeltaRappen).toBe(0)
  })

  it('claws the credited amount back when the paid cancellation becomes chargeable again', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 0,
      mustPay: true,
      note: 'Doch verrechnen',
      payments: [paid({
        payment_status: 'refunded',
        metadata: { obligation_prev_charge_percentage: 100 },
      })],
      ledger: [ledger(9500, 'cancellation_charge_waiver', { notes: 'prev_charge=100' })],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.nextChargePercentage).toBe(100)
    expect(plan.creditDeltaRappen).toBe(-9500)
    expect(plan.paymentUpdates[0]).toMatchObject({
      payment_status: 'completed',
      refunded_at: null,
    })
    expect(plan.paymentUpdates[0].metadata.obligation_prev_charge_percentage).toBeUndefined()
  })

  it('credits only the retained half of a partial cancellation fee', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 50,
      mustPay: false,
      payments: [paid({ payment_status: 'refunded' })],
      ledger: [ledger(4750)],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creditDeltaRappen).toBe(4750)
    expect(plan.paymentUpdates[0].metadata.obligation_prev_charge_percentage).toBe(50)
  })

  it('restores a 50% fee without removing the original partial refund', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 0,
      mustPay: true,
      payments: [paid({
        payment_status: 'refunded',
        metadata: { obligation_prev_charge_percentage: 50 },
      })],
      ledger: [
        ledger(4750, 'cancellation'),
        ledger(4750, 'cancellation_charge_waiver', { notes: 'prev_charge=50' }),
      ],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.nextChargePercentage).toBe(50)
    expect(plan.creditDeltaRappen).toBe(-4750)
    expect(plan.paymentUpdates[0].payment_status).toBe('refunded')
  })

  it('cancels an unpaid charged appointment without a wallet credit', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 100,
      mustPay: false,
      payments: [paid({ payment_status: 'pending', total_amount_rappen: 9500 })],
      ledger: [],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creditDeltaRappen).toBe(0)
    expect(plan.paymentUpdates[0].payment_status).toBe('cancelled')
    expect(plan.summary).toContain('aufgehoben')
  })

  it('reopens an unpaid appointment when the charge is restored', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 0,
      mustPay: true,
      payments: [paid({
        payment_status: 'cancelled',
        metadata: {
          obligation_prev_charge_percentage: 100,
          obligation_credit_used_rappen: 0,
        },
      })],
      ledger: [],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creditDeltaRappen).toBe(0)
    expect(plan.nextChargePercentage).toBe(100)
    expect(plan.paymentUpdates[0]).toMatchObject({
      payment_status: 'pending',
      credit_used_rappen: 0,
    })
  })

  it('returns wallet credit that was already applied to an unpaid appointment', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 100,
      mustPay: false,
      payments: [paid({
        payment_status: 'pending',
        total_amount_rappen: 9500,
        credit_used_rappen: 4000,
      })],
      ledger: [],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creditDeltaRappen).toBe(4000)
    expect(plan.paymentUpdates[0]).toMatchObject({
      payment_status: 'cancelled',
      credit_used_rappen: 0,
    })
  })

  it('ignores Wallee refunds and appointment payments when computing the wallet credit', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 100,
      mustPay: false,
      payments: [paid({ refunded_amount_rappen: 2000 })],
      ledger: [
        ledger(-9500, 'appointment_payment'),
        ledger(2000, 'cancellation', { payment_method: 'wallee_refund', balance_before_rappen: null, balance_after_rappen: null }),
      ],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.creditDeltaRappen).toBe(7500)
  })

  it('credits a paid appointment whose charge was already cleared but whose wallet was not', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 0,
      mustPay: false,
      note: 'Nachbuchen',
      payments: [paid()],
      ledger: [],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.noop).toBe(false)
    expect(plan.creditDeltaRappen).toBe(9500)
    expect(plan.paymentUpdates[0].payment_status).toBe('refunded')
  })

  it('is a no-op when the binary status already matches', () => {
    const waive = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 0,
      mustPay: false,
      payments: [paid({ payment_status: 'refunded' })],
      ledger: [ledger(9500)],
      nowIso: NOW,
    })
    const keep = planCancellationObligationChange({
      appointmentStatus: 'cancelled',
      chargePercentage: 50,
      mustPay: true,
      payments: [paid()],
      ledger: [],
      nowIso: NOW,
    })
    expect(waive.ok && waive.noop).toBe(true)
    expect(keep.ok && keep.noop).toBe(true)
  })

  it('rejects appointments that are not cancelled', () => {
    const plan = planCancellationObligationChange({
      appointmentStatus: 'confirmed',
      chargePercentage: 0,
      mustPay: false,
      payments: [],
      ledger: [],
      nowIso: NOW,
    })
    expect(plan.ok).toBe(false)
  })
})
