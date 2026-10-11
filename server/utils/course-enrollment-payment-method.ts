/**
 * Cash/invoice enrollments share `/api/courses/enroll-cash`.
 * The course column is the source of truth so confirmation emails
 * (Bar vs Rechnung) cannot be spoofed or defaulted incorrectly.
 */

export const INVOICE_ENROLLMENT_DISABLED_MESSAGE =
  'Dieser Kurs ist auf Rechnung eingestellt, aber Rechnungszahlung ist für dieses Unternehmen derzeit nicht freigeschaltet. Bitte kontaktiere das Unternehmen oder wähle einen anderen Kurs.'

/**
 * Fail closed when a course is locked to INVOICE but the tenant invoice
 * feature flag is off. Do not silently rewrite to cash or Wallee.
 */
export function assertInvoiceEnrollmentAllowed(opts: {
  coursePaymentMethod?: string | null
  invoiceEnabled: boolean
}): void {
  if (opts.coursePaymentMethod === 'INVOICE' && opts.invoiceEnabled !== true) {
    throw new Error(INVOICE_ENROLLMENT_DISABLED_MESSAGE)
  }
}

export function resolveNonWalleeEnrollmentMethod(opts: {
  coursePaymentMethod?: string | null
  invoiceEnabled: boolean
}): 'invoice' | 'cash_on_site' {
  assertInvoiceEnrollmentAllowed(opts)
  if (opts.coursePaymentMethod === 'INVOICE' && opts.invoiceEnabled) {
    return 'invoice'
  }
  return 'cash_on_site'
}
