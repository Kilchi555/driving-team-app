/** Legacy status written by older invoice flows. Same meaning as `invoiced`. */
export const INVOICED_PAYMENT_STATUSES = ['invoiced', 'invoice'] as const

export function isInvoicedPaymentStatus(status?: string | null): boolean {
  return status === 'invoiced' || status === 'invoice'
}

/** Payment already on a sent/created invoice — no longer billable in the Zahlungsübersicht. */
export function isInvoicedPayment(payment?: {
  payment_status?: string | null
  invoice_id?: string | null
} | null): boolean {
  if (!payment) return false
  return isInvoicedPaymentStatus(payment.payment_status) || !!payment.invoice_id
}
