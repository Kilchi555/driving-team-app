/**
 * Remaining cash due for one payment in process-bulk-payment.
 * A completed payment is already fully settled and is not billed again.
 * Partial payments still subtract amount_paid_rappen. Other open statuses
 * do not, which is the existing bulk formula.
 */
export interface CashSettlementPayment {
  total_amount_rappen?: number | null
  admin_fee_rappen?: number | null
  credit_used_rappen?: number | null
  amount_paid_rappen?: number | null
  payment_status?: string | null
  appointments?: {
    status?: string | null
    cancellation_charge_percentage?: number | null
  } | null
}

export function cashSettlementDueRappen(payment: CashSettlementPayment): {
  fullDue: number
  alreadyPaid: number
  remaining: number
} {
  let fullDue = (payment.total_amount_rappen || 0) - (payment.credit_used_rappen || 0)
  if (payment.appointments?.status === 'cancelled') {
    const chargePercentage = payment.appointments.cancellation_charge_percentage ?? 100
    const appointmentCost = (payment.total_amount_rappen || 0) - (payment.admin_fee_rappen || 0)
    fullDue = Math.round(appointmentCost * chargePercentage / 100)
  }
  const alreadyPaid = payment.payment_status === 'completed'
    ? fullDue
    : payment.payment_status === 'partial'
      ? (payment.amount_paid_rappen || 0)
      : 0
  return {
    fullDue,
    alreadyPaid,
    remaining: Math.max(0, fullDue - alreadyPaid),
  }
}
