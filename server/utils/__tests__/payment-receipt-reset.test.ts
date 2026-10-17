import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  authorizeReceiptReset,
  evaluateReceiptReset,
  simulateReceiptReset,
  type ReceiptResetSnapshot,
} from '../payment-receipt-reset'
import { receiptResetRpcArgs, receiptResetStatus } from '../payment-receipt-reset-http'
import { invoicePaymentHistoryLabel, netInvoicePaymentsRappen } from '../../../utils/invoice-payment-net'

const TENANT = '660b72a9-c67b-4763-85d7-b7ba6605e59e'
const CUSTOMER = 'c841d989-c017-4e3c-9e5d-249538131464'
const APPOINTMENT = '1076a300-30aa-42ad-b564-a6c5c74ab694'
const PAYMENT = '0bce2dc1-31a3-4780-b66d-89303bad0c49'
const INVOICE = 'c4c8c04c-413b-40c6-8f0e-a93469769056'
const SETTLEMENT = 'f607f3eb-adaf-42dd-ab2f-36f37ca39439'
const INCOME = '15ae333d-bdd1-4c21-b1f7-619d4b1d88e6'
const SIBLING_124 = '3f92930d-4894-4718-b7a9-b96d8ae0165f'
const SIBLING_155 = 'e49d9ff7-3862-47ec-b7d8-9309130dcf6c'
const ACTOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function gemperli(overrides: Partial<ReceiptResetSnapshot> = {}): ReceiptResetSnapshot {
  const base: ReceiptResetSnapshot = {
    actorUserId: ACTOR,
    callerRole: 'admin',
    callerTenantId: TENANT,
    asOfDate: '2026-10-16',
    payment: {
      id: PAYMENT,
      tenantId: TENANT,
      userId: CUSTOMER,
      appointmentId: APPOINTMENT,
      invoiceId: INVOICE,
      paymentMethod: 'invoice',
      paymentStatus: 'completed',
      totalAmountRappen: 18600,
      paidAt: '2026-10-07T00:00:00.000Z',
      walleeTransactionId: null,
      refundedAmountRappen: 0,
    },
    appointmentStatus: 'paid',
    invoice: {
      id: INVOICE,
      tenantId: TENANT,
      invoiceNumber: 'RE-2026-0043',
      totalAmountRappen: 46500,
      paidAmountRappen: 46500,
      status: 'paid',
      paymentStatus: 'paid',
      dueDate: '2026-10-13',
    },
    invoiceLines: [
      { id: 'line-186', appointmentId: APPOINTMENT, totalPriceRappen: 18600 },
      { id: 'line-124', appointmentId: 'cedd4998-6cf7-4318-89a6-d72200e819d9', totalPriceRappen: 12400 },
      { id: 'line-155', appointmentId: 'cf82bfea-3cf6-4410-9950-4c34f165adb1', totalPriceRappen: 15500 },
    ],
    siblingPayments: [
      { id: SIBLING_124, totalAmountRappen: 12400, paymentStatus: 'completed' },
      { id: SIBLING_155, totalAmountRappen: 15500, paymentStatus: 'completed' },
    ],
    settlements: [
      {
        id: SETTLEMENT,
        amountRappen: 46500,
        status: 'completed',
        paymentMethod: 'manual',
        paymentReference: null,
      },
    ],
    accountingEntries: [
      { id: INCOME, amountRappen: 18600, stornoOfId: null, deletedAt: null },
    ],
    cashTransactionCount: 0,
    bankImportCount: 0,
    decisions: {
      reason: null,
      confirmSiblingsRemainSettled: false,
      invoiceLineDisposition: null,
      appointmentDisposition: null,
      appointmentStatus: null,
      idempotencyKey: null,
    },
  }
  return {
    ...base,
    ...overrides,
    payment: overrides.payment === undefined ? base.payment : overrides.payment,
    invoice: overrides.invoice === undefined ? base.invoice : overrides.invoice,
    decisions: { ...base.decisions, ...overrides.decisions },
  }
}

const confirmed = {
  reason: 'Lektion war nicht eingegangen',
  confirmSiblingsRemainSettled: true,
  invoiceLineDisposition: 'remain_on_invoice' as const,
  appointmentDisposition: 'leave_unchanged' as const,
  appointmentStatus: null,
  idempotencyKey: 'idem-gemperli-1',
}

describe('invoice payment history net', () => {
  it('subtracts a reversal from the completed settlement', () => {
    expect(netInvoicePaymentsRappen([
      { amount_rappen: 46500, status: 'completed' },
      { amount_rappen: 18600, status: 'reversal' },
    ])).toBe(27900)
    expect(invoicePaymentHistoryLabel('reversal')).toBe('Korrektur')
    expect(invoicePaymentHistoryLabel('completed')).toBe('Bezahlt')
  })
})

describe('authorizeReceiptReset', () => {
  it('allows only admin and tenant_admin', () => {
    expect(authorizeReceiptReset(null)).toBe('unauthenticated')
    expect(authorizeReceiptReset('staff')).toBe('forbidden')
    expect(authorizeReceiptReset('client')).toBe('forbidden')
    expect(authorizeReceiptReset('admin')).toBe('ok')
    expect(authorizeReceiptReset('tenant_admin')).toBe('ok')
  })
})

describe('Gemperli shared invoice receipt', () => {
  it('aborts when the open business choices are missing', () => {
    const result = evaluateReceiptReset(gemperli())
    expect(result.blocked).toBe(true)
    expect(result.plan).toBeNull()
    expect(result.reasons).toEqual(expect.arrayContaining([
      'missing_reason',
      'missing_sibling_confirmation',
      'missing_invoice_line_disposition',
      'missing_appointment_disposition',
    ]))
    const after = simulateReceiptReset(gemperli(), result)
    expect(after.paymentStatus).toBe('completed')
    expect(after.paidAmountRappen).toBe(46500)
    expect(after.siblingStatuses[SIBLING_124]).toBe('completed')
    expect(after.siblingStatuses[SIBLING_155]).toBe('completed')
    expect(after.stornoCount).toBe(0)
    expect(after.reversalCount).toBe(0)
    expect(after.appointmentStatus).toBe('paid')
  })

  it('aborts detach instead of inventing an invoice-line removal', () => {
    const result = evaluateReceiptReset(gemperli({
      decisions: { ...confirmed, invoiceLineDisposition: 'detach' },
    }))
    expect(result.blocked).toBe(true)
    expect(result.reasons).toContain('invoice_line_detach_not_supported')
    expect(result.plan).toBeNull()
  })

  it('plans only the CHF 186 line when the admin confirms the open choices', () => {
    const snapshot = gemperli({ decisions: confirmed })
    const result = evaluateReceiptReset(snapshot)
    expect(result.blocked).toBe(false)
    expect(result.plan).toMatchObject({
      paymentId: PAYMENT,
      targetStatus: 'invoice',
      keepInvoiceId: true,
      invoiceId: INVOICE,
      settlementId: SETTLEMENT,
      reversalAmountRappen: 18600,
      nextPaidAmountRappen: 27900,
      openAmountRappen: 18600,
      nextInvoicePaymentStatus: 'partial',
      nextInvoiceStatus: 'overdue',
      accountingEntryId: INCOME,
      createStorno: true,
      nextAppointmentStatus: null,
      untouchedPaymentIds: [SIBLING_124, SIBLING_155],
    })
    expect(result.plan?.untouchedPaymentIds).not.toContain(PAYMENT)
    const after = simulateReceiptReset(snapshot, result)
    expect(after.paymentStatus).toBe('invoice')
    expect(after.paidAt).toBeNull()
    expect(after.invoiceId).toBe(INVOICE)
    expect(after.paidAmountRappen).toBe(27900)
    expect(after.invoicePaymentStatus).toBe('partial')
    expect(snapshot.invoice!.totalAmountRappen - after.paidAmountRappen).toBe(18600)
    expect(after.siblingStatuses).toEqual({
      [SIBLING_124]: 'completed',
      [SIBLING_155]: 'completed',
    })
    expect(after.appointmentStatus).toBe('paid')
    expect(after.reversalCount).toBe(1)
    expect(after.stornoCount).toBe(1)
  })

  it('recognizes an applied reset before dispositions are chosen', () => {
    const applied = gemperli({
      payment: {
        id: PAYMENT,
        tenantId: TENANT,
        userId: CUSTOMER,
        appointmentId: APPOINTMENT,
        invoiceId: INVOICE,
        paymentMethod: 'invoice',
        paymentStatus: 'invoice',
        totalAmountRappen: 18600,
        paidAt: null,
        walleeTransactionId: null,
        refundedAmountRappen: 0,
      },
      invoice: {
        id: INVOICE,
        tenantId: TENANT,
        invoiceNumber: 'RE-2026-0043',
        totalAmountRappen: 46500,
        paidAmountRappen: 27900,
        status: 'overdue',
        paymentStatus: 'partial',
        dueDate: '2026-10-13',
      },
      settlements: [
        {
          id: SETTLEMENT,
          amountRappen: 46500,
          status: 'completed',
          paymentMethod: 'manual',
          paymentReference: null,
        },
        {
          id: 'reversal-1',
          amountRappen: 18600,
          status: 'reversal',
          paymentMethod: 'reversal',
          paymentReference: PAYMENT,
        },
      ],
      accountingEntries: [
        { id: INCOME, amountRappen: 18600, stornoOfId: null, deletedAt: null },
        { id: 'storno-1', amountRappen: 18600, stornoOfId: INCOME, deletedAt: null },
      ],
    })
    const result = evaluateReceiptReset(applied)
    expect(result.alreadyApplied).toBe(true)
    expect(result.blocked).toBe(false)
    expect(result.reasons).toEqual([])
    const args = receiptResetRpcArgs(applied, result)
    expect(args?.p_invoice_line_disposition).toBeNull()
    expect(args?.p_appointment_disposition).toBeNull()
    expect(args?.p_confirm_siblings).toBe(false)
    expect(args?.p_reason).toBe('Bereits korrigiert')
    const after = simulateReceiptReset(applied, result)
    expect(after.reversalCount).toBe(1)
    expect(after.stornoCount).toBe(1)
  })

  it('does not treat an applied reset as clean when wallet credit remains', () => {
    const applied = gemperli({
      payment: {
        id: PAYMENT,
        tenantId: TENANT,
        userId: CUSTOMER,
        appointmentId: APPOINTMENT,
        invoiceId: INVOICE,
        paymentMethod: 'invoice',
        paymentStatus: 'invoice',
        totalAmountRappen: 18600,
        paidAt: null,
        walleeTransactionId: null,
        refundedAmountRappen: 0,
      },
      invoice: {
        id: INVOICE,
        tenantId: TENANT,
        invoiceNumber: 'RE-2026-0043',
        totalAmountRappen: 46500,
        paidAmountRappen: 27900,
        creditAppliedRappen: 5000,
        status: 'overdue',
        paymentStatus: 'partial',
        dueDate: '2026-10-13',
      },
      settlements: [
        {
          id: SETTLEMENT,
          amountRappen: 46500,
          status: 'completed',
          paymentMethod: 'manual',
          paymentReference: null,
        },
        {
          id: 'reversal-1',
          amountRappen: 18600,
          status: 'reversal',
          paymentMethod: 'reversal',
          paymentReference: PAYMENT,
        },
      ],
      accountingEntries: [
        { id: INCOME, amountRappen: 18600, stornoOfId: null, deletedAt: null },
        { id: 'storno-1', amountRappen: 18600, stornoOfId: INCOME, deletedAt: null },
      ],
    })
    const result = evaluateReceiptReset(applied)
    expect(result.blocked).toBe(true)
    expect(result.alreadyApplied).toBe(false)
    expect(result.reasons).toContain('wallet_credit_present')
    expect(result.plan).toBeNull()
    expect(receiptResetRpcArgs(applied, result)).toBeNull()
  })

  it('blocks wallet credit, an invoice credit transaction, and Staff-POS credit before any reversal', () => {
    const stamped = gemperli({
      decisions: confirmed,
      invoice: { ...gemperli().invoice!, creditAppliedRappen: 5000 },
    })
    const stampedResult = evaluateReceiptReset(stamped)
    expect(stampedResult.blocked).toBe(true)
    expect(stampedResult.plan).toBeNull()
    expect(stampedResult.reasons[0]).toBe('wallet_credit_present')
    expect(receiptResetRpcArgs(stamped, stampedResult)).toBeNull()
    expect(simulateReceiptReset(stamped, stampedResult).paidAmountRappen).toBe(46500)

    const invoiced = gemperli({ decisions: confirmed, invoiceCreditTransactionCount: 1 })
    const invoicedResult = evaluateReceiptReset(invoiced)
    expect(invoicedResult.reasons).toContain('invoice_credit_transaction_present')
    expect(invoicedResult.plan).toBeNull()

    const staff = gemperli({ decisions: confirmed, staffPosCreditCount: 1 })
    const staffResult = evaluateReceiptReset(staff)
    expect(staffResult.reasons).toContain('staff_pos_credit_present')
    expect(staffResult.plan).toBeNull()
    expect(simulateReceiptReset(staff, staffResult)).toMatchObject({
      paymentStatus: 'completed',
      reversalCount: 0,
      stornoCount: 0,
    })
  })

  it('does not create a second reversal or storno when the same correction is replayed', () => {
    const applied = gemperli({
      payment: {
        id: PAYMENT,
        tenantId: TENANT,
        userId: CUSTOMER,
        appointmentId: APPOINTMENT,
        invoiceId: INVOICE,
        paymentMethod: 'invoice',
        paymentStatus: 'invoice',
        totalAmountRappen: 18600,
        paidAt: null,
        walleeTransactionId: null,
        refundedAmountRappen: 0,
      },
      invoice: {
        id: INVOICE,
        tenantId: TENANT,
        invoiceNumber: 'RE-2026-0043',
        totalAmountRappen: 46500,
        paidAmountRappen: 27900,
        status: 'overdue',
        paymentStatus: 'partial',
        dueDate: '2026-10-13',
      },
      settlements: [
        {
          id: SETTLEMENT,
          amountRappen: 46500,
          status: 'completed',
          paymentMethod: 'manual',
          paymentReference: null,
        },
        {
          id: 'reversal-1',
          amountRappen: 18600,
          status: 'reversal',
          paymentMethod: 'reversal',
          paymentReference: PAYMENT,
        },
      ],
      accountingEntries: [
        { id: INCOME, amountRappen: 18600, stornoOfId: null, deletedAt: null },
        { id: 'storno-1', amountRappen: 18600, stornoOfId: INCOME, deletedAt: null },
      ],
      decisions: { ...confirmed, idempotencyKey: 'idem-gemperli-2' },
    })
    const result = evaluateReceiptReset(applied)
    expect(result.alreadyApplied).toBe(true)
    expect(result.plan?.createStorno).toBe(false)
    expect(result.plan?.reversalAmountRappen).toBe(0)
    const after = simulateReceiptReset(applied, result)
    expect(after.reversalCount).toBe(1)
    expect(after.stornoCount).toBe(1)
    expect(after.siblingStatuses[SIBLING_124]).toBe('completed')
    expect(after.paidAmountRappen).toBe(27900)
  })

  it('rejects another tenant and an actual cash or bank receipt', () => {
    const otherTenant = evaluateReceiptReset(gemperli({ callerTenantId: '11111111-1111-4111-8111-111111111111' }))
    expect(otherTenant.reasons).toContain('tenant_mismatch')
    expect(otherTenant.plan).toBeNull()

    const cash = evaluateReceiptReset(gemperli({
      decisions: confirmed,
      payment: {
        ...gemperli().payment!,
        paymentMethod: 'cash',
      },
    }))
    expect(cash.reasons).toContain('actual_receipt_channel')
    expect(cash.plan).toBeNull()

    const bank = evaluateReceiptReset(gemperli({
      decisions: confirmed,
      bankImportCount: 1,
    }))
    expect(bank.reasons).toContain('bank_settlement_present')
    expect(bank.plan).toBeNull()
  })

  it('does not call the database function while the case is blocked', () => {
    const snapshot = gemperli()
    const evaluation = evaluateReceiptReset(snapshot)
    expect(receiptResetStatus(evaluation)).toBe(409)
    expect(receiptResetRpcArgs(snapshot, evaluation)).toBeNull()
  })

  it('sends only this payment to the database function', () => {
    const snapshot = gemperli({ decisions: confirmed })
    const evaluation = evaluateReceiptReset(snapshot)
    const args = receiptResetRpcArgs(snapshot, evaluation)
    expect(args?.p_payment_id).toBe(PAYMENT)
    expect(args?.p_tenant_id).toBe(TENANT)
    expect(args?.p_actor_user_id).toBe(ACTOR)
    expect(JSON.stringify(args)).not.toContain(SIBLING_124)
    expect(JSON.stringify(args)).not.toContain(SIBLING_155)
    expect(args?.p_expected_paid_after).toBe(27900)
    expect(args?.p_appointment_status).toBeNull()
    expect(args?.p_invoice_line_disposition).toBe('remain_on_invoice')
    expect(args?.p_appointment_disposition).toBe('leave_unchanged')
  })
})

describe('admin_reset_mistaken_receipt SQL', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'migrations/20261016_admin_reset_mistaken_receipt.sql'),
    'utf8',
  )

  it('locks the payment and invoice and never updates sibling payments by invoice id', () => {
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain("status = 'reversal'")
    expect(sql).toContain('storno_of_id')
    expect(sql).not.toMatch(/UPDATE\s+public\.payments\s+SET[\s\S]*WHERE\s+invoice_id/i)
    expect(sql).toContain('p_payment_id')
    expect(sql).toContain('GRANT EXECUTE')
    expect(sql).toContain('service_role')
    const body = sql.slice(sql.indexOf('AS $$'))
    const updatePayment = body.indexOf('UPDATE public.payments')
    expect(body.indexOf("RAISE EXCEPTION 'wallet_credit_present'")).toBeLessThan(updatePayment)
    expect(body.indexOf("RAISE EXCEPTION 'invoice_credit_transaction_present'")).toBeLessThan(updatePayment)
    expect(body.indexOf("RAISE EXCEPTION 'staff_pos_credit_present'")).toBeLessThan(updatePayment)
    expect(body.indexOf("RAISE EXCEPTION 'wallet_credit_present'")).toBeLessThan(body.indexOf("'result', 'already_applied'"))
    expect(body.indexOf("'result', 'already_applied'")).toBeLessThan(body.indexOf("RAISE EXCEPTION 'missing_invoice_line_disposition'"))
    expect(body).toContain('AND tenant_id = p_tenant_id')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(body).toContain("RAISE EXCEPTION 'idempotency_payment_mismatch'")
  })
})

describe('PaymentReceiptResetDialog', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'components/admin/PaymentReceiptResetDialog.vue'),
    'utf8',
  )

  it('keeps the form when a rejected submit has a preview', () => {
    expect(source).toContain('v-else-if="loadError && !preview"')
    expect(source).toContain('v-else-if="preview"')
    expect(source).toContain('v-model="reason"')
    expect(source).toContain('v-model="disposition"')
    expect(source).toContain('wallet_credit_present')
    expect(source).toContain('staff_pos_credit_present')
    expect(source).toContain('idempotency_payment_mismatch')
  })
})
