/**
 * Plans a mistaken invoice-receipt reset.
 * Pure: no database access. Callers must pass a tenant-scoped snapshot.
 * Missing business choices abort. This module never invents them.
 */

export const RECEIPT_RESET_ROLES = ['admin', 'tenant_admin'] as const

export const APPOINTMENT_STATUS_ALLOWLIST = [
  'confirmed',
  'scheduled',
  'completed',
  'cancelled',
  'pending',
  'verrechnet',
] as const

const MIN_REASON_LENGTH = 10

export type InvoiceLineDisposition = 'remain_on_invoice' | 'detach'
export type AppointmentDisposition = 'leave_unchanged' | 'set_status'

export interface ReceiptResetDecisions {
  reason: string | null
  confirmSiblingsRemainSettled: boolean
  invoiceLineDisposition: InvoiceLineDisposition | null
  appointmentDisposition: AppointmentDisposition | null
  appointmentStatus: string | null
  idempotencyKey: string | null
}

export interface ReceiptResetSnapshot {
  actorUserId: string | null
  callerRole: string | null
  callerTenantId: string | null
  asOfDate: string
  payment: {
    id: string
    tenantId: string
    userId: string
    appointmentId: string | null
    invoiceId: string | null
    paymentMethod: string | null
    paymentStatus: string | null
    totalAmountRappen: number
    paidAt: string | null
    walleeTransactionId: string | null
    refundedAmountRappen: number
    creditTransactionId?: string | null
  } | null
  appointmentStatus: string | null
  invoice: {
    id: string
    tenantId: string
    invoiceNumber: string | null
    totalAmountRappen: number
    paidAmountRappen: number
    status: string | null
    paymentStatus: string | null
    dueDate: string | null
    creditAppliedRappen?: number
  } | null
  invoiceLines: Array<{
    id: string
    appointmentId: string | null
    totalPriceRappen: number
  }>
  siblingPayments: Array<{
    id: string
    totalAmountRappen: number
    paymentStatus: string | null
  }>
  settlements: Array<{
    id: string
    amountRappen: number
    status: string | null
    paymentMethod: string | null
    paymentReference: string | null
  }>
  accountingEntries: Array<{
    id: string
    amountRappen: number
    stornoOfId: string | null
    deletedAt: string | null
  }>
  cashTransactionCount: number
  bankImportCount: number
  invoiceCreditTransactionCount?: number
  staffPosCreditCount?: number
  creditLookupFailed?: boolean
  decisions: ReceiptResetDecisions
}

export interface ReceiptResetPlan {
  alreadyApplied: boolean
  paymentId: string
  targetStatus: 'invoice' | 'pending'
  clearPaidAt: boolean
  keepInvoiceId: boolean
  invoiceId: string | null
  settlementId: string | null
  reversalAmountRappen: number
  nextPaidAmountRappen: number
  nextInvoiceStatus: 'sent' | 'overdue' | 'paid'
  nextInvoicePaymentStatus: 'partial' | 'pending' | 'overdue' | 'paid'
  openAmountRappen: number
  accountingEntryId: string | null
  createStorno: boolean
  appointmentId: string | null
  nextAppointmentStatus: string | null
  untouchedPaymentIds: string[]
  idempotencyKey: string
}

export interface ReceiptResetEvaluation {
  authorized: boolean
  blocked: boolean
  alreadyApplied: boolean
  reasons: string[]
  proposedTargetStatus: 'invoice' | 'pending' | null
  requires: {
    reason: boolean
    siblingConfirmation: boolean
    invoiceLineDisposition: boolean
    appointmentDisposition: boolean
  }
  discovered: {
    paymentId: string | null
    invoiceId: string | null
    invoiceNumber: string | null
    invoiceTotalRappen: number | null
    lineAmountRappen: number | null
    siblingLineAmountsRappen: number[]
    settlementIds: string[]
    accountingEntryIds: string[]
  }
  plan: ReceiptResetPlan | null
}

export function authorizeReceiptReset(role: string | null | undefined): 'ok' | 'unauthenticated' | 'forbidden' {
  if (!role) return 'unauthenticated'
  if ((RECEIPT_RESET_ROLES as readonly string[]).includes(role)) return 'ok'
  return 'forbidden'
}

function emptyDiscovered(): ReceiptResetEvaluation['discovered'] {
  return {
    paymentId: null,
    invoiceId: null,
    invoiceNumber: null,
    invoiceTotalRappen: null,
    lineAmountRappen: null,
    siblingLineAmountsRappen: [],
    settlementIds: [],
    accountingEntryIds: [],
  }
}

function completedSettlements(snapshot: ReceiptResetSnapshot) {
  return snapshot.settlements.filter(row => row.status === 'completed')
}

function reversalForPayment(snapshot: ReceiptResetSnapshot, paymentId: string) {
  return snapshot.settlements.find(row =>
    row.status === 'reversal' && row.paymentReference === paymentId,
  ) ?? null
}

function liveIncome(snapshot: ReceiptResetSnapshot) {
  return snapshot.accountingEntries.filter(row => !row.deletedAt && !row.stornoOfId)
}

function stornoExists(snapshot: ReceiptResetSnapshot, entryId: string) {
  return snapshot.accountingEntries.some(row => row.stornoOfId === entryId && !row.deletedAt)
}

export function evaluateReceiptReset(snapshot: ReceiptResetSnapshot): ReceiptResetEvaluation {
  const reasons: string[] = []
  const auth = authorizeReceiptReset(snapshot.callerRole)
  if (auth === 'unauthenticated') reasons.push('unauthenticated')
  if (auth === 'forbidden') reasons.push('forbidden')
  if (!snapshot.actorUserId) reasons.push('actor_required')

  const payment = snapshot.payment
  const discovered = emptyDiscovered()
  if (!payment) {
    reasons.push('payment_not_found')
    return blockedResult(reasons, discovered)
  }

  discovered.paymentId = payment.id
  if (!snapshot.callerTenantId || payment.tenantId !== snapshot.callerTenantId) {
    reasons.push('tenant_mismatch')
    return blockedResult(reasons, discovered)
  }

  const invoice = snapshot.invoice
  if (invoice && invoice.tenantId !== payment.tenantId) reasons.push('tenant_mismatch')
  if (payment.invoiceId && invoice && invoice.id !== payment.invoiceId) reasons.push('invoice_link_mismatch')

  const ownLines = snapshot.invoiceLines.filter(line => line.appointmentId && line.appointmentId === payment.appointmentId)
  const siblingLines = snapshot.invoiceLines.filter(line => !ownLines.includes(line))
  discovered.invoiceId = invoice?.id ?? payment.invoiceId
  discovered.invoiceNumber = invoice?.invoiceNumber ?? null
  discovered.invoiceTotalRappen = invoice?.totalAmountRappen ?? null
  discovered.lineAmountRappen = ownLines.length === 1 ? ownLines[0].totalPriceRappen : null
  discovered.siblingLineAmountsRappen = siblingLines.map(line => line.totalPriceRappen)
  discovered.settlementIds = completedSettlements(snapshot).map(row => row.id)
  discovered.accountingEntryIds = liveIncome(snapshot).map(row => row.id)

  if (ownLines.length > 1) reasons.push('ambiguous_invoice_lines')
  if (ownLines.length === 1 && ownLines[0].totalPriceRappen !== payment.totalAmountRappen) {
    reasons.push('amount_line_mismatch')
  }

  const siblingsPresent = snapshot.siblingPayments.length > 0 || siblingLines.length > 0
    || completedSettlements(snapshot).some(row => row.amountRappen > payment.totalAmountRappen)
  const requiresSibling = siblingsPresent
  const requiresDisposition = Boolean(payment.invoiceId || invoice)
  const requiresAppointment = Boolean(payment.appointmentId)

  if (payment.paymentMethod === 'cash' || snapshot.cashTransactionCount > 0 || payment.walleeTransactionId) {
    reasons.push('actual_receipt_channel')
  }
  if (snapshot.bankImportCount > 0) reasons.push('bank_settlement_present')
  if ((payment.refundedAmountRappen ?? 0) > 0 || payment.paymentStatus === 'refunded') {
    reasons.push('refunded_payment')
  }

  const income = liveIncome(snapshot)
  if (income.length > 1) reasons.push('ambiguous_accounting')
  const incomeEntry = income.length === 1 ? income[0] : null
  if (incomeEntry && incomeEntry.amountRappen !== payment.totalAmountRappen) {
    reasons.push('accounting_amount_mismatch')
  }
  if (incomeEntry && stornoExists(snapshot, incomeEntry.id) && isReceivedStatus(payment.paymentStatus)) {
    reasons.push('partial_prior_storno')
  }

  const settlements = completedSettlements(snapshot)
  if (settlements.length > 1) reasons.push('ambiguous_settlements')
  const settlement = settlements.length === 1 ? settlements[0] : null
  if (isReceivedStatus(payment.paymentStatus) && invoice && !settlement) reasons.push('missing_settlement')

  const reversal = reversalForPayment(snapshot, payment.id)
  const alreadyApplied = !isReceivedStatus(payment.paymentStatus)
    && payment.paidAt == null
    && (!incomeEntry || stornoExists(snapshot, incomeEntry.id))
    && (!invoice || Boolean(reversal))

  if ((invoice?.creditAppliedRappen ?? 0) > 0) reasons.push('wallet_credit_present')
  if ((snapshot.invoiceCreditTransactionCount ?? 0) > 0) reasons.push('invoice_credit_transaction_present')
  if ((snapshot.staffPosCreditCount ?? 0) > 0) reasons.push('staff_pos_credit_present')
  if (payment.creditTransactionId) reasons.push('linked_credit_transaction_present')
  if (snapshot.creditLookupFailed) reasons.push('credit_lookup_failed')
  if (reasons.some(code => [
    'wallet_credit_present',
    'invoice_credit_transaction_present',
    'staff_pos_credit_present',
    'linked_credit_transaction_present',
    'credit_lookup_failed',
  ].includes(code))) {
    return {
      ...blockedResult(reasons, discovered),
      requires: requirementFlags(requiresSibling, requiresDisposition, requiresAppointment),
    }
  }

  if (alreadyApplied && reasons.filter(code => code !== 'actor_required' && code !== 'unauthenticated' && code !== 'forbidden').length === 0
    && auth === 'ok' && snapshot.actorUserId) {
    return {
      authorized: true,
      blocked: false,
      alreadyApplied: true,
      reasons: [],
      proposedTargetStatus: payment.paymentStatus === 'pending' ? 'pending' : 'invoice',
      requires: requirementFlags(requiresSibling, requiresDisposition, requiresAppointment),
      discovered,
      plan: {
        alreadyApplied: true,
        paymentId: payment.id,
        targetStatus: payment.paymentStatus === 'pending' ? 'pending' : 'invoice',
        clearPaidAt: true,
        keepInvoiceId: Boolean(payment.invoiceId),
        invoiceId: payment.invoiceId,
        settlementId: settlement?.id ?? null,
        reversalAmountRappen: 0,
        nextPaidAmountRappen: invoice?.paidAmountRappen ?? 0,
        nextInvoiceStatus: (invoice?.status === 'overdue' || invoice?.status === 'sent' || invoice?.status === 'paid')
          ? invoice.status
          : 'sent',
        nextInvoicePaymentStatus: invoice?.paymentStatus === 'partial' || invoice?.paymentStatus === 'pending' || invoice?.paymentStatus === 'overdue' || invoice?.paymentStatus === 'paid'
          ? invoice.paymentStatus
          : 'pending',
        openAmountRappen: Math.max(0, (invoice?.totalAmountRappen ?? 0) - (invoice?.paidAmountRappen ?? 0)),
        accountingEntryId: incomeEntry?.id ?? null,
        createStorno: false,
        appointmentId: payment.appointmentId,
        nextAppointmentStatus: null,
        untouchedPaymentIds: snapshot.siblingPayments.map(row => row.id),
        idempotencyKey: snapshot.decisions.idempotencyKey || `already:${payment.id}`,
      },
    }
  }

  if (!isReceivedStatus(payment.paymentStatus)) reasons.push('status_not_resettable')

  const reason = snapshot.decisions.reason?.trim() ?? ''
  if (reason.length < MIN_REASON_LENGTH) reasons.push('missing_reason')
  if (!snapshot.decisions.idempotencyKey?.trim()) reasons.push('missing_idempotency_key')

  if (requiresSibling && !snapshot.decisions.confirmSiblingsRemainSettled) {
    reasons.push('missing_sibling_confirmation')
  }
  if (requiresDisposition && !snapshot.decisions.invoiceLineDisposition) {
    reasons.push('missing_invoice_line_disposition')
  }
  if (snapshot.decisions.invoiceLineDisposition === 'detach') {
    reasons.push('invoice_line_detach_not_supported')
  }
  if (requiresAppointment && !snapshot.decisions.appointmentDisposition) {
    reasons.push('missing_appointment_disposition')
  }
  let nextAppointmentStatus: string | null = null
  if (snapshot.decisions.appointmentDisposition === 'set_status') {
    const requested = snapshot.decisions.appointmentStatus
    if (!requested || !(APPOINTMENT_STATUS_ALLOWLIST as readonly string[]).includes(requested)) {
      reasons.push('invalid_appointment_status')
    } else {
      nextAppointmentStatus = requested
    }
  }

  const hardBlocks = reasons.filter(code => ![
    'missing_reason',
    'missing_idempotency_key',
    'missing_sibling_confirmation',
    'missing_invoice_line_disposition',
    'missing_appointment_disposition',
    'invalid_appointment_status',
    'invoice_line_detach_not_supported',
  ].includes(code))

  if (reasons.length > 0) {
    return {
      ...blockedResult(reasons, discovered),
      requires: requirementFlags(requiresSibling, requiresDisposition, requiresAppointment),
      proposedTargetStatus: hardBlocks.length === 0 && snapshot.decisions.invoiceLineDisposition === 'remain_on_invoice'
        ? 'invoice'
        : null,
    }
  }

  if (!invoice || !settlement) {
    return blockedResult(['missing_settlement'], discovered)
  }

  const nextPaid = snapshot.siblingPayments
    .filter(row => row.paymentStatus === 'completed' || row.paymentStatus === 'paid')
    .reduce((sum, row) => sum + row.totalAmountRappen, 0)
  if (nextPaid < 0 || nextPaid > invoice.totalAmountRappen) {
    return blockedResult(['paid_amount_out_of_range'], discovered)
  }

  const pastDue = Boolean(invoice.dueDate && invoice.dueDate < snapshot.asOfDate)
  let nextInvoiceStatus: ReceiptResetPlan['nextInvoiceStatus']
  let nextInvoicePaymentStatus: ReceiptResetPlan['nextInvoicePaymentStatus']
  if (nextPaid <= 0) {
    nextInvoicePaymentStatus = pastDue ? 'overdue' : 'pending'
    nextInvoiceStatus = pastDue ? 'overdue' : 'sent'
  } else if (nextPaid < invoice.totalAmountRappen) {
    nextInvoicePaymentStatus = 'partial'
    // Set overdue directly when the due date has passed. The BEFORE trigger
    // rewrites payment_status to overdue when status is sent.
    nextInvoiceStatus = pastDue ? 'overdue' : 'sent'
  } else {
    nextInvoicePaymentStatus = 'paid'
    nextInvoiceStatus = 'paid'
  }

  return {
    authorized: true,
    blocked: false,
    alreadyApplied: false,
    reasons: [],
    proposedTargetStatus: 'invoice',
    requires: requirementFlags(requiresSibling, requiresDisposition, requiresAppointment),
    discovered,
    plan: {
      alreadyApplied: false,
      paymentId: payment.id,
      targetStatus: 'invoice',
      clearPaidAt: true,
      keepInvoiceId: true,
      invoiceId: invoice.id,
      settlementId: settlement.id,
      reversalAmountRappen: payment.totalAmountRappen,
      nextPaidAmountRappen: nextPaid,
      nextInvoiceStatus,
      nextInvoicePaymentStatus,
      openAmountRappen: invoice.totalAmountRappen - nextPaid,
      accountingEntryId: incomeEntry?.id ?? null,
      createStorno: Boolean(incomeEntry) && !stornoExists(snapshot, incomeEntry!.id),
      appointmentId: payment.appointmentId,
      nextAppointmentStatus,
      untouchedPaymentIds: snapshot.siblingPayments.map(row => row.id),
      idempotencyKey: snapshot.decisions.idempotencyKey!.trim(),
    },
  }
}

function isReceivedStatus(status: string | null) {
  return status === 'completed' || status === 'paid'
}

function requirementFlags(sibling: boolean, disposition: boolean, appointment: boolean) {
  return {
    reason: true,
    siblingConfirmation: sibling,
    invoiceLineDisposition: disposition,
    appointmentDisposition: appointment,
  }
}

function blockedResult(reasons: string[], discovered: ReceiptResetEvaluation['discovered']): ReceiptResetEvaluation {
  return {
    authorized: !reasons.includes('unauthenticated') && !reasons.includes('forbidden'),
    blocked: true,
    alreadyApplied: false,
    reasons: [...new Set(reasons)],
    proposedTargetStatus: null,
    requires: {
      reason: true,
      siblingConfirmation: false,
      invoiceLineDisposition: false,
      appointmentDisposition: false,
    },
    discovered,
    plan: null,
  }
}

export interface SimulatedResetState {
  paymentStatus: string | null
  paidAt: string | null
  invoiceId: string | null
  paidAmountRappen: number
  invoiceStatus: string | null
  invoicePaymentStatus: string | null
  siblingStatuses: Record<string, string | null>
  appointmentStatus: string | null
  reversalCount: number
  stornoCount: number
}

export function simulateReceiptReset(
  snapshot: ReceiptResetSnapshot,
  evaluation: ReceiptResetEvaluation,
): SimulatedResetState {
  const payment = snapshot.payment
  const base: SimulatedResetState = {
    paymentStatus: payment?.paymentStatus ?? null,
    paidAt: payment?.paidAt ?? null,
    invoiceId: payment?.invoiceId ?? null,
    paidAmountRappen: snapshot.invoice?.paidAmountRappen ?? 0,
    invoiceStatus: snapshot.invoice?.status ?? null,
    invoicePaymentStatus: snapshot.invoice?.paymentStatus ?? null,
    siblingStatuses: Object.fromEntries(snapshot.siblingPayments.map(row => [row.id, row.paymentStatus])),
    appointmentStatus: snapshot.appointmentStatus,
    reversalCount: snapshot.settlements.filter(row => row.status === 'reversal').length,
    stornoCount: snapshot.accountingEntries.filter(row => row.stornoOfId && !row.deletedAt).length,
  }
  if (!evaluation.plan || evaluation.blocked) return base
  const plan = evaluation.plan
  if (plan.alreadyApplied) return base
  for (const siblingId of plan.untouchedPaymentIds) {
    if (!(siblingId in base.siblingStatuses)) {
      throw new Error(`plan names an unknown sibling ${siblingId}`)
    }
  }
  return {
    ...base,
    paymentStatus: plan.targetStatus,
    paidAt: plan.clearPaidAt ? null : base.paidAt,
    invoiceId: plan.keepInvoiceId ? plan.invoiceId : null,
    paidAmountRappen: plan.nextPaidAmountRappen,
    invoiceStatus: plan.nextInvoiceStatus,
    invoicePaymentStatus: plan.nextInvoicePaymentStatus,
    appointmentStatus: plan.nextAppointmentStatus ?? base.appointmentStatus,
    reversalCount: base.reversalCount + (plan.reversalAmountRappen > 0 ? 1 : 0),
    stornoCount: base.stornoCount + (plan.createStorno ? 1 : 0),
  }
}
