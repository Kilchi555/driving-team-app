/**
 * Online checkout (logged-in + guest) never writes cash.
 * Cash is staff-only in the calendar / POS. The public booking UI only
 * offers wallee and optionally invoice — guest-book used to ignore that
 * and hardcode cash, so open bookings looked like "bar bezahlt".
 */
export type OnlineBookingCheckoutMethod = 'wallee' | 'invoice'

export function resolveOnlineBookingPaymentMethod(opts: {
  requested?: string | null
  invoicePaymentsEnabled: boolean
}): { method: OnlineBookingCheckoutMethod; rejectedInvoice: boolean } {
  if (opts.requested === 'invoice') {
    if (opts.invoicePaymentsEnabled) {
      return { method: 'invoice', rejectedInvoice: false }
    }
    return { method: 'wallee', rejectedInvoice: true }
  }
  return { method: 'wallee', rejectedInvoice: false }
}

export function onlineBookingPaymentProvider(
  method: OnlineBookingCheckoutMethod
): 'wallee' | null {
  return method === 'wallee' ? 'wallee' : null
}
