import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  accountStaffPosCash,
  planStaffPosBulkRemainder,
  staffPosBulkKind,
  staffPosCashBookableRappen,
  staffPosPermanentExclusions,
  type StaffPosBulkRow,
} from '~/utils/staff-pos-bulk-split'

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

describe('cash dialog accounting', () => {
  const appointment = { id: 'appt', dueRappen: 5000, kind: 'normal' as const }
  const secondAppointment = { id: 'appt-2', dueRappen: 8000, kind: 'normal' as const }
  const deferred = { id: 'deferred', dueRappen: 10000, kind: 'deferred' as const }
  const invoice = { id: 'invoice', dueRappen: 10000, kind: 'invoice' as const }
  const wallee = { id: 'wallee', dueRappen: 2000, kind: 'wallee' as const }
  const walleeOnly = { id: 'wallee-only', dueRappen: 10000, kind: 'wallee' as const }
  const cashSale = { id: 'cash-sale', dueRappen: 1500, kind: 'cash' as const }

  function recorded(rows: StaffPosBulkRow[], enteredRappen: number) {
    return accountStaffPosCash({ method: 'cash', enteredRappen, rows })
  }

  it('does not present appointment + deferred + Wallee as one cash total', () => {
    const rows = [appointment, deferred, wallee]
    expect(staffPosCashBookableRappen({ method: 'cash', rows })).toBe(15000)
    expect(staffPosCashBookableRappen({ method: 'cash', rows })).not.toBe(17000)

    const inflated = recorded(rows, 17000)
    expect(inflated.confirmable).toBe(false)
    expect(inflated.accountedRappen).toBe(15000)
    expect(inflated.unaccountedRappen).toBe(2000)
    expect(inflated.overpaymentRappen).toBe(0)
    expect(inflated.plan.bulkPartialRappen).toBe(5000)
    expect(inflated.plan.completeDeferred).toBe(true)
    expect(inflated.lines.find((line) => line.id === 'wallee')?.bookedRappen).toBe(0)
    expect(inflated.lines.find((line) => line.id === 'wallee')?.message).toMatch(/Online/)

    const bookable = recorded(rows, 15000)
    expect(bookable.confirmable).toBe(true)
    expect(bookable.accountedRappen).toBe(15000)
    expect(bookable.lines.find((line) => line.id === 'deferred')?.bookedRappen).toBe(10000)
    expect(bookable.lines.find((line) => line.id === 'appt')?.bookedRappen).toBe(5000)
    expect(bookable.lines.reduce((sum, line) => sum + line.bookedRappen, 0) + bookable.overpaymentRappen).toBe(15000)
  })

  it('does not present an invoice-only sale as cash-bookable', () => {
    const rows = [invoice]
    expect(staffPosCashBookableRappen({ method: 'cash', rows })).toBe(0)
    const accounting = recorded(rows, 10000)
    expect(accounting.confirmable).toBe(false)
    expect(accounting.accountedRappen).toBe(0)
    expect(accounting.lines[0]?.bookedRappen).toBe(0)
    expect(accounting.lines[0]?.message).toMatch(/Rechnung/)
    expect(staffPosPermanentExclusions(rows)).toEqual([
      expect.objectContaining({ kind: 'invoice', dueRappen: 10000 }),
    ])
  })

  it('does not present a Wallee-only sale as cash-bookable', () => {
    const rows = [walleeOnly]
    expect(staffPosCashBookableRappen({ method: 'cash', rows })).toBe(0)
    const accounting = recorded(rows, 10000)
    expect(accounting.confirmable).toBe(false)
    expect(accounting.accountedRappen).toBe(0)
    expect(accounting.overpaymentRappen).toBe(0)
    expect(accounting.lines[0]?.message).toMatch(/Online/)
  })

  it('does not book a cash staff sale again', () => {
    const rows = [cashSale, appointment]
    expect(staffPosCashBookableRappen({ method: 'cash', rows })).toBe(5000)
    const accounting = recorded(rows, 5000)
    expect(accounting.confirmable).toBe(true)
    expect(accounting.lines.find((line) => line.id === 'cash-sale')?.bookedRappen).toBe(0)
    expect(accounting.lines.find((line) => line.id === 'cash-sale')?.message).toMatch(/nicht noch einmal/)
    expect(accounting.plan.cashSaleIds).toEqual(['cash-sale'])
    expect(accounting.plan.normalIds).toEqual(['appt'])
    expect(accounting.plan.bulkPartialRappen).toBe(5000)

    const inflated = recorded(rows, 6500)
    expect(inflated.confirmable).toBe(false)
    expect(inflated.overpaymentRappen).toBe(0)
    expect(inflated.accountedRappen).toBe(5000)
  })

  it('keeps a genuine appointment overpayment', () => {
    const accounting = recorded([appointment], 7000)
    expect(accounting.confirmable).toBe(true)
    expect(accounting.accountedRappen).toBe(7000)
    expect(accounting.overpaymentRappen).toBe(2000)
    expect(accounting.plan.bulkPartialRappen).toBe(7000)
    expect(accounting.lines[0]?.bookedRappen).toBe(5000)
  })

  it('accounts for an appointment and a fully covered deferred sale once', () => {
    const rows = [appointment, deferred]
    const first = recorded(rows, 15000)
    const second = recorded(rows, 15000)
    expect(first.confirmable).toBe(true)
    expect(first.bookedDeferredRappen).toBe(10000)
    expect(first.bookedNormalRappen).toBe(5000)
    expect(first.lines.filter((line) => line.kind === 'deferred')).toHaveLength(1)
    expect(first.plan.completeDeferred).toBe(true)
    expect(first.plan.bulkPartialRappen).toBe(5000)
    expect(second).toEqual(first)
  })

  it('keeps preview, exclusion copy, and the bulk plan on the same amount', () => {
    const rows = [secondAppointment, appointment, deferred, invoice, wallee, cashSale]
    const selected = rows.reduce((sum, row) => sum + row.dueRappen, 0)
    const bookable = staffPosCashBookableRappen({ method: 'cash', rows })
    expect(bookable).toBe(5000 + 8000 + 10000)
    expect(bookable).toBeLessThan(selected)

    const refused = recorded(rows, selected)
    expect(refused.confirmable).toBe(false)
    expect(refused.unaccountedRappen).toBe(selected - bookable)
    expect(refused.overpaymentRappen).toBe(0)
    expect(refused.plan).toEqual(planStaffPosBulkRemainder({
      method: 'cash',
      enteredRappen: selected,
      rows,
    }))
    const refusedPreview = refused.lines.reduce((sum, line) => sum + line.bookedRappen, 0) + refused.overpaymentRappen
    expect(refusedPreview).toBe(refused.accountedRappen)
    expect(refused.lines.filter((line) => line.exclusion).every((line) => line.bookedRappen === 0 && line.message)).toBe(true)

    const accepted = recorded(rows, bookable)
    expect(accepted.confirmable).toBe(true)
    expect(accepted.accountedRappen).toBe(bookable)
    expect(accepted.plan.completeDeferred).toBe(true)
    expect(accepted.plan.bulkPartialRappen).toBe(13000)
    expect(accepted.lines.find((line) => line.id === 'appt')?.bookedRappen).toBe(5000)
    expect(accepted.lines.find((line) => line.id === 'appt-2')?.bookedRappen).toBe(8000)
    expect(accepted.lines.find((line) => line.id === 'deferred')?.bookedRappen).toBe(10000)

    const partial = recorded([secondAppointment, appointment], 6000)
    expect(partial.confirmable).toBe(true)
    expect(partial.lines.find((line) => line.id === 'appt')?.bookedRappen).toBe(5000)
    expect(partial.lines.find((line) => line.id === 'appt-2')?.bookedRappen).toBe(1000)
  })

  it('persists a deferred-only overpayment in the accounted amount', () => {
    const rows = [deferred]
    const exact = recorded(rows, 10000)
    expect(exact.confirmable).toBe(true)
    expect(exact.plan.completeDeferred).toBe(true)
    expect(exact.plan.callBulk).toBe(false)
    expect(exact.overpaymentRappen).toBe(0)
    expect(exact.accountedRappen).toBe(10000)

    const over = recorded(rows, 12000)
    expect(over.confirmable).toBe(true)
    expect(over.plan.completeDeferred).toBe(true)
    expect(over.plan.callBulk).toBe(false)
    expect(over.bookedDeferredRappen).toBe(10000)
    expect(over.overpaymentRappen).toBe(2000)
    expect(over.accountedRappen).toBe(12000)
    expect(over.unaccountedRappen).toBe(0)

    const short = recorded(rows, 8000)
    expect(short.confirmable).toBe(false)
    expect(short.plan.completeDeferred).toBe(false)
    expect(short.overpaymentRappen).toBe(0)
    expect(short.accountedRappen).toBe(0)
  })

  it('keeps an appointment plus deferred overpayment on the bulk call', () => {
    const rows = [appointment, deferred]
    const accounting = recorded(rows, 17000)
    expect(accounting.confirmable).toBe(true)
    expect(accounting.plan.completeDeferred).toBe(true)
    expect(accounting.plan.callBulk).toBe(true)
    expect(accounting.bookedDeferredRappen).toBe(10000)
    expect(accounting.bookedNormalRappen).toBe(7000)
    expect(accounting.overpaymentRappen).toBe(2000)
    expect(accounting.accountedRappen).toBe(17000)
    expect(accounting.plan.bulkPartialRappen).toBe(7000)
  })

  it('does not turn an excluded Wallee gap into deferred overpayment', () => {
    const rows = [deferred, wallee]
    const accounting = recorded(rows, 14000)
    expect(accounting.plan.callBulk).toBe(false)
    expect(accounting.overpaymentRappen).toBe(2000)
    expect(accounting.accountedRappen).toBe(12000)
    expect(accounting.unaccountedRappen).toBe(2000)
    expect(accounting.confirmable).toBe(false)
  })

  it('refuses a short deferred amount instead of dropping the difference', () => {
    const rows = [deferred, appointment]
    const short = recorded(rows, 8000)
    expect(short.confirmable).toBe(false)
    expect(short.accountedRappen).toBe(5000)
    expect(short.unaccountedRappen).toBe(3000)
    expect(short.overpaymentRappen).toBe(0)
    expect(short.plan.completeDeferred).toBe(false)
    expect(short.lines.find((line) => line.id === 'deferred')?.message).toMatch(/vollständig/)

    const appointmentOnly = recorded(rows, 5000)
    expect(appointmentOnly.confirmable).toBe(true)
    expect(appointmentOnly.bookedDeferredRappen).toBe(0)
    expect(appointmentOnly.bookedNormalRappen).toBe(5000)
  })
})

describe('cash dialog wiring', () => {
  const vueSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../components/EnhancedStudentModal.vue'),
    'utf8',
  )

  it('prefills and confirms only the shared bookable cash amount', () => {
    const openDialog = vueSource.slice(
      vueSource.indexOf('const openCashPaymentDialog'),
      vueSource.indexOf('async function completeDeferredStaffPos'),
    )
    const confirm = vueSource.slice(
      vueSource.indexOf('const confirmPartialPayment'),
      vueSource.indexOf('const openCreditPaymentDialog'),
    )
    const handler = vueSource.slice(
      vueSource.indexOf('const handleBulkPayment'),
      vueSource.indexOf('const confirmPartialPayment'),
    )

    expect(openDialog).toContain('staffPosCashBookableRappen')
    expect(openDialog).not.toContain('totalSelectedAmount')
    expect(confirm.indexOf('if (!accounting.confirmable) return')).toBeLessThan(
      confirm.indexOf('showPartialPaymentDialog.value = false'),
    )
    expect(handler.indexOf('if (!accounting.confirmable) return')).toBeLessThan(
      handler.indexOf('completeDeferredStaffPos'),
    )
    expect(vueSource).toContain("await $fetch('/api/admin/staff-pos/complete'")
    expect(handler.indexOf('if (!accounting.confirmable) return')).toBeLessThan(
      handler.indexOf("'/api/staff/process-bulk-payment'"),
    )
    expect(vueSource).toContain('!cashAccounting.confirmable')
    expect(vueSource).toContain('cashAccounting.accountedRappen')
    expect(vueSource).toContain('cashAccounting.unaccountedRappen')
    expect(vueSource).not.toContain("alert('Produktverkäufe auf Rechnung werden über die Rechnung bezahlt.')")
    expect(vueSource).not.toContain("alert('Offene Online-Produktverkäufe werden nicht über die Barzahlung abgeschlossen.')")
    const overpaymentCall = handler.indexOf("'/api/admin/staff-pos/overpayment'")
    expect(handler.indexOf('if (!plan.callBulk && accounting.overpaymentRappen > 0)')).toBeGreaterThan(
      handler.indexOf('completeDeferredStaffPos'),
    )
    expect(overpaymentCall).toBeGreaterThan(handler.indexOf('completeDeferredStaffPos'))
    expect(overpaymentCall).toBeLessThan(handler.indexOf("'/api/staff/process-bulk-payment'"))
    expect(handler).not.toContain('payment_ids: plan.deferredIds, method')
  })
})
