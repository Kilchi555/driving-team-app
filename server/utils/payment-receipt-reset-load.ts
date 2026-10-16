import type { ReceiptResetDecisions, ReceiptResetSnapshot } from '~/server/utils/payment-receipt-reset'

type QueryResult<T> = { data: T | null; error: { message: string } | null }

export interface ReceiptResetDb {
  from: (table: string) => {
    select: (columns: string) => ReceiptResetFilter
  }
}

interface ReceiptResetFilter {
  eq: (column: string, value: string) => ReceiptResetFilter
  in?: (column: string, values: string[]) => ReceiptResetFilter
  then?: unknown
  maybeSingle?: () => Promise<QueryResult<Record<string, unknown>>>
}

export interface ReceiptResetRequest {
  callerRole: string | null
  callerTenantId: string | null
  actorUserId: string | null
  paymentId?: string | null
  appointmentId?: string | null
  asOfDate: string
  decisions: ReceiptResetDecisions
}

function rows<T>(result: QueryResult<T[] | T | null>): T[] {
  if (!result.data) return []
  return Array.isArray(result.data) ? result.data : [result.data]
}

export async function loadReceiptResetSnapshot(
  db: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => Promise<QueryResult<Array<Record<string, unknown>>>> & {
          eq: (column: string, value: string) => Promise<QueryResult<Array<Record<string, unknown>>>> & {
            in: (column: string, values: string[]) => Promise<QueryResult<Array<Record<string, unknown>>>>
          }
          in: (column: string, values: string[]) => Promise<QueryResult<Array<Record<string, unknown>>>>
          maybeSingle: () => Promise<QueryResult<Record<string, unknown>>>
        }
      }
    }
  },
  request: ReceiptResetRequest,
): Promise<ReceiptResetSnapshot> {
  const empty = emptySnapshot(request)
  if (!request.callerTenantId || (!request.paymentId && !request.appointmentId)) return empty

  let paymentQuery = db.from('payments').select(
    'id, tenant_id, user_id, appointment_id, invoice_id, payment_method, payment_status, total_amount_rappen, paid_at, wallee_transaction_id, refunded_amount_rappen, credit_transaction_id',
  ).eq('tenant_id', request.callerTenantId)
  paymentQuery = request.paymentId
    ? paymentQuery.eq('id', request.paymentId)
    : paymentQuery.eq('appointment_id', request.appointmentId as string)
  const paymentResult = await paymentQuery
  const payments = rows(paymentResult)
  if (payments.length !== 1) return empty

  const payment = payments[0]
  const paymentId = String(payment.id)
  const invoiceId = payment.invoice_id ? String(payment.invoice_id) : null
  const appointmentId = payment.appointment_id ? String(payment.appointment_id) : null

  const [invoiceResult, lineResult, siblingResult, settlementResult, accountingResult, cashResult, bankResult, appointmentResult] = await Promise.all([
    invoiceId
      ? db.from('invoices').select('id, tenant_id, invoice_number, total_amount_rappen, paid_amount_rappen, credit_applied_rappen, status, payment_status, due_date').eq('tenant_id', request.callerTenantId).eq('id', invoiceId)
      : Promise.resolve({ data: [], error: null }),
    invoiceId
      ? db.from('invoice_items').select('id, appointment_id, total_price_rappen').eq('tenant_id', request.callerTenantId).eq('invoice_id', invoiceId)
      : Promise.resolve({ data: [], error: null }),
    invoiceId
      ? db.from('payments').select('id, total_amount_rappen, payment_status').eq('tenant_id', request.callerTenantId).eq('invoice_id', invoiceId)
      : Promise.resolve({ data: [], error: null }),
    invoiceId
      ? db.from('invoice_payments').select('id, amount_rappen, status, payment_method, payment_reference').eq('tenant_id', request.callerTenantId).eq('invoice_id', invoiceId)
      : Promise.resolve({ data: [], error: null }),
    db.from('accounting_entries').select('id, amount_rappen, storno_of_id, deleted_at, linked_payment_id').eq('tenant_id', request.callerTenantId).eq('linked_payment_id', paymentId),
    appointmentId
      ? db.from('cash_transactions').select('id').eq('tenant_id', request.callerTenantId).eq('appointment_id', appointmentId)
      : Promise.resolve({ data: [], error: null }),
    invoiceId
      ? db.from('bank_import_records').select('id').eq('tenant_id', request.callerTenantId).eq('invoice_id', invoiceId)
      : Promise.resolve({ data: [], error: null }),
    appointmentId
      ? db.from('appointments').select('id, status').eq('tenant_id', request.callerTenantId).eq('id', appointmentId)
      : Promise.resolve({ data: [], error: null }),
  ])

  const invoice = rows(invoiceResult)[0]
  const siblings = rows(siblingResult).filter(row => String(row.id) !== paymentId)
  const creditPaymentIds = [paymentId, ...siblings.map(row => String(row.id))]
  const [invoiceCreditResult, staffCreditResult] = await Promise.all([
    invoiceId
      ? db.from('credit_transactions')
        .select('id, tenant_id, reference_id, reference_type, transaction_type')
        .eq('reference_id', invoiceId)
        .eq('reference_type', 'invoice')
        .in('transaction_type', ['deposit', 'credit_product_purchase'])
      : Promise.resolve({ data: [], error: null }),
    db.from('credit_transactions')
      .select('id, tenant_id, reference_id, reference_type, transaction_type')
      .eq('reference_type', 'payment')
      .eq('transaction_type', 'credit_product_purchase')
      .in('reference_id', creditPaymentIds),
  ])
  const creditLookupFailed = Boolean(invoiceCreditResult.error || staffCreditResult.error)
  const visibleCredit = (row: Record<string, unknown>) => row.tenant_id == null || String(row.tenant_id) === request.callerTenantId
  const incomeRows = rows(accountingResult).filter(row => String(row.linked_payment_id) === paymentId)
  const incomeIds = incomeRows.map(row => String(row.id))
  const stornoResult = incomeIds.length > 0
    ? await db.from('accounting_entries')
      .select('id, amount_rappen, storno_of_id, deleted_at, linked_payment_id')
      .eq('tenant_id', request.callerTenantId)
      .in('storno_of_id', incomeIds)
    : { data: [], error: null }

  return {
    ...empty,
    payment: {
      id: paymentId,
      tenantId: String(payment.tenant_id),
      userId: String(payment.user_id),
      appointmentId,
      invoiceId,
      paymentMethod: payment.payment_method ? String(payment.payment_method) : null,
      paymentStatus: payment.payment_status ? String(payment.payment_status) : null,
      totalAmountRappen: Number(payment.total_amount_rappen ?? 0),
      paidAt: payment.paid_at ? String(payment.paid_at) : null,
      walleeTransactionId: payment.wallee_transaction_id ? String(payment.wallee_transaction_id) : null,
      refundedAmountRappen: Number(payment.refunded_amount_rappen ?? 0),
      creditTransactionId: payment.credit_transaction_id ? String(payment.credit_transaction_id) : null,
    },
    appointmentStatus: rows(appointmentResult)[0]?.status ? String(rows(appointmentResult)[0].status) : null,
    invoice: invoice ? {
      id: String(invoice.id),
      tenantId: String(invoice.tenant_id),
      invoiceNumber: invoice.invoice_number ? String(invoice.invoice_number) : null,
      totalAmountRappen: Number(invoice.total_amount_rappen ?? 0),
      paidAmountRappen: Number(invoice.paid_amount_rappen ?? 0),
      status: invoice.status ? String(invoice.status) : null,
      paymentStatus: invoice.payment_status ? String(invoice.payment_status) : null,
      dueDate: invoice.due_date ? String(invoice.due_date) : null,
      creditAppliedRappen: Number(invoice.credit_applied_rappen ?? 0),
    } : null,
    invoiceLines: rows(lineResult).map(row => ({
      id: String(row.id),
      appointmentId: row.appointment_id ? String(row.appointment_id) : null,
      totalPriceRappen: Number(row.total_price_rappen ?? 0),
    })),
    siblingPayments: siblings.map(row => ({
      id: String(row.id),
      totalAmountRappen: Number(row.total_amount_rappen ?? 0),
      paymentStatus: row.payment_status ? String(row.payment_status) : null,
    })),
    settlements: rows(settlementResult).map(row => ({
      id: String(row.id),
      amountRappen: Number(row.amount_rappen ?? 0),
      status: row.status ? String(row.status) : null,
      paymentMethod: row.payment_method ? String(row.payment_method) : null,
      paymentReference: row.payment_reference ? String(row.payment_reference) : null,
    })),
    accountingEntries: [...incomeRows, ...rows(stornoResult)].map(row => ({
      id: String(row.id),
      amountRappen: Number(row.amount_rappen ?? 0),
      stornoOfId: row.storno_of_id ? String(row.storno_of_id) : null,
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    })),
    cashTransactionCount: rows(cashResult).length,
    bankImportCount: rows(bankResult).length,
    invoiceCreditTransactionCount: rows(invoiceCreditResult).filter(visibleCredit).length,
    staffPosCreditCount: rows(staffCreditResult).filter(visibleCredit).length,
    creditLookupFailed,
  }
}

function emptySnapshot(request: ReceiptResetRequest): ReceiptResetSnapshot {
  return {
    actorUserId: request.actorUserId,
    callerRole: request.callerRole,
    callerTenantId: request.callerTenantId,
    asOfDate: request.asOfDate,
    payment: null,
    appointmentStatus: null,
    invoice: null,
    invoiceLines: [],
    siblingPayments: [],
    settlements: [],
    accountingEntries: [],
    cashTransactionCount: 0,
    bankImportCount: 0,
    invoiceCreditTransactionCount: 0,
    staffPosCreditCount: 0,
    creditLookupFailed: false,
    decisions: request.decisions,
  }
}

export function zurichDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(now)
}
