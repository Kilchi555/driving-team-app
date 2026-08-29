export const REFUNDED_PAYMENT_STATUSES = ['refunded', 'partially_refunded'] as const

export function isRefundedPaymentStatus(status?: string | null): boolean {
  return status === 'refunded' || status === 'partially_refunded'
}

/** Already collected, invoiced, or refunded — must not be marked paid again. */
export function isSettledOrRefundedPaymentStatus(status?: string | null): boolean {
  return status === 'completed'
    || status === 'authorized'
    || isRefundedPaymentStatus(status)
}
