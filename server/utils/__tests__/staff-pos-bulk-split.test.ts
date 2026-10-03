import { describe, expect, it } from 'vitest'
import { planStaffPosBulkRemainder, staffPosBulkKind } from '~/utils/staff-pos-bulk-split'

const sale = (fulfillment: string, method = fulfillment) => ({
  payment_method: method,
  appointment_id: null,
  metadata: { source: 'staff_product_sale', fulfillment },
})

describe('staff POS bulk classification', () => {
  it('keeps pending Wallee out of the invoice bucket', () => {
    expect(staffPosBulkKind(sale('wallee'))).toBe('wallee')
    expect(staffPosBulkKind(sale('wallee'))).not.toBe('invoice')
  })

  it('keeps invoice and invoice send together, and cash separate', () => {
    expect(staffPosBulkKind(sale('invoice'))).toBe('invoice')
    expect(staffPosBulkKind(sale('invoice_send', 'invoice'))).toBe('invoice')
    expect(staffPosBulkKind(sale('cash'))).toBe('cash')
    expect(staffPosBulkKind(sale('deferred'))).toBe('deferred')
    expect(staffPosBulkKind({
      payment_method: 'cash',
      appointment_id: 'appt-1',
      metadata: { source: 'appointment' },
    })).toBe('normal')
  })
})

describe('staff POS bulk remainder', () => {
  const appointment = { id: 'appt', dueRappen: 5000, kind: 'normal' as const }
  const deferred = { id: 'deferred', dueRappen: 10000, kind: 'deferred' as const }
  const invoice = { id: 'invoice', dueRappen: 4000, kind: 'invoice' as const }
  const invoiceSend = { id: 'invoice-send', dueRappen: 3000, kind: 'invoice' as const }
  const wallee = { id: 'wallee', dueRappen: 2000, kind: 'wallee' as const }
  const cashSale = { id: 'cash-sale', dueRappen: 1500, kind: 'cash' as const }

  it('completes deferred when cash covers it and forwards only the remainder', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 15000,
      rows: [deferred, appointment],
    })
    expect(plan.completeDeferred).toBe(true)
    expect(plan.deferredIds).toEqual(['deferred'])
    expect(plan.normalIds).toEqual(['appt'])
    expect(plan.bulkPartialRappen).toBe(5000)
    expect(plan.callBulk).toBe(true)
  })

  it('does not complete a short deferred payment or forward the unused cash as surplus', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 8000,
      rows: [deferred, appointment],
    })
    expect(plan.completeDeferred).toBe(false)
    expect(plan.bulkPartialRappen).toBe(5000)
    expect(plan.bulkPartialRappen).toBeLessThan(8000)
    expect(plan.callBulk).toBe(true)
  })

  it('drops an invoice staff sale from the bulk amount', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 9000,
      rows: [invoice, appointment],
    })
    expect(plan.invoiceSaleIds).toEqual(['invoice'])
    expect(plan.normalIds).toEqual(['appt'])
    expect(plan.bulkPartialRappen).toBe(5000)
    expect(plan.walleeSaleIds).toEqual([])
  })

  it('drops an invoice-send staff sale the same way', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 8000,
      rows: [invoiceSend, appointment],
    })
    expect(plan.invoiceSaleIds).toEqual(['invoice-send'])
    expect(plan.bulkPartialRappen).toBe(5000)
    expect(plan.walleeSaleIds).toEqual([])
  })

  it('does not classify pending Wallee as an invoice or add its amount to the bulk', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 7000,
      rows: [wallee, appointment],
    })
    expect(plan.walleeSaleIds).toEqual(['wallee'])
    expect(plan.invoiceSaleIds).toEqual([])
    expect(plan.normalIds).toEqual(['appt'])
    expect(plan.bulkPartialRappen).toBe(5000)
  })

  it('keeps a cash staff sale out of the invoice list and out of the forwarded amount', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 6500,
      rows: [cashSale, appointment],
    })
    expect(plan.cashSaleIds).toEqual(['cash-sale'])
    expect(plan.invoiceSaleIds).toEqual([])
    expect(plan.normalIds).toEqual(['appt'])
    expect(plan.completeDeferred).toBe(false)
    expect(plan.bulkPartialRappen).toBe(5000)
  })

  it('accounts for a mixed selection without paying any row more than its due', () => {
    const entered = 5000 + 10000 + 4000 + 2000 + 1500
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: entered,
      rows: [appointment, deferred, invoice, wallee, cashSale],
    })
    expect(plan.completeDeferred).toBe(true)
    expect(plan.deferredDueRappen).toBe(10000)
    expect(plan.invoiceSaleIds).toEqual(['invoice'])
    expect(plan.walleeSaleIds).toEqual(['wallee'])
    expect(plan.cashSaleIds).toEqual(['cash-sale'])
    expect(plan.normalIds).toEqual(['appt'])
    expect(plan.bulkPartialRappen).toBe(5000)
    expect((plan.bulkPartialRappen || 0) + plan.deferredDueRappen).toBe(15000)
    expect(plan.bulkPartialRappen).toBeLessThanOrEqual(appointment.dueRappen)
  })

  it('keeps a genuine overpayment above the whole selection', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 6000,
      rows: [appointment],
    })
    expect(plan.bulkPartialRappen).toBe(6000)
    expect(plan.callBulk).toBe(true)
  })

  it('keeps an ordinary partial payment below the appointment due', () => {
    const plan = planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: 2000,
      rows: [appointment],
    })
    expect(plan.bulkPartialRappen).toBe(2000)
    expect(plan.completeDeferred).toBe(false)
  })
})
