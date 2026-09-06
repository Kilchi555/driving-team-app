export type OnlineBookingPaymentMethod = 'wallee' | 'invoice' | 'cash'

export function shouldHoldAppointmentUntilPaid(opts: {
  requirePaymentBeforeConfirm: boolean
  paymentMethod: OnlineBookingPaymentMethod
  amountRappen: number
}): boolean {
  if (!opts.requirePaymentBeforeConfirm) return false
  if (opts.paymentMethod !== 'wallee') return false
  return (Number(opts.amountRappen) || 0) > 0
}

export const PAY_BEFORE_CONFIRM_HOLD_MINUTES = 10

export function isPaidOrInFlightStatus(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'authorized' || status === 'processing'
}

export function isPayBeforeConfirmHold(payment: { metadata?: any } | null | undefined): boolean {
  return payment?.metadata?.pay_before_confirm === true
}

/** Only our unpaid checkout holds may be auto-cancelled — never staff/pending leftovers. */
export function canReleaseUnpaidHold(
  payments: Array<{
    payment_status?: string | null
    metadata?: any
    checkout_status?: string | null
    wallee_transaction_id?: string | null
  }>
): boolean {
  if (!payments.length) return false
  if (!payments.some(isPayBeforeConfirmHold)) return false
  if (payments.some(p => isPaidOrInFlightStatus(p.payment_status))) return false
  if (payments.some(p =>
    p.wallee_transaction_id
    || p.checkout_status === 'creating'
    || p.checkout_status === 'recovery_pending'
  )) {
    return false
  }
  return true
}

export function shouldConfirmHeldAppointmentFromPayments(
  payments: Array<{ payment_status?: string | null; metadata?: any }>
): 'completed' | 'authorized' | null {
  const holdPayments = payments.filter(isPayBeforeConfirmHold)
  if (holdPayments.some(p => p.payment_status === 'completed')) return 'completed'
  if (holdPayments.some(p => p.payment_status === 'authorized')) return 'authorized'
  return null
}

/** Unpaid checkout holds must not get a confirmation email/SMS/push. */
export function shouldDeferConfirmationUntilPaid(
  appointmentStatus: string | null | undefined,
  payments: Array<{ payment_status?: string | null; metadata?: any }>
): boolean {
  if (appointmentStatus !== 'pending') return false
  if (!payments.some(isPayBeforeConfirmHold)) return false
  return shouldConfirmHeldAppointmentFromPayments(payments) === null
}
