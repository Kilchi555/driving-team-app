/**
 * Cash/invoice enrollments share `/api/courses/enroll-cash`.
 * The course column is the source of truth so confirmation emails
 * (Bar vs Rechnung) cannot be spoofed or defaulted incorrectly.
 */
export function resolveNonWalleeEnrollmentMethod(opts: {
  coursePaymentMethod?: string | null
  invoiceEnabled: boolean
}): 'invoice' | 'cash_on_site' {
  if (opts.coursePaymentMethod === 'INVOICE' && opts.invoiceEnabled) {
    return 'invoice'
  }
  return 'cash_on_site'
}
