/**
 * Map course insert/update failures to an HTTP status the admin UI can show.
 * Payment-method check violations are a client/schema mismatch, not a 500.
 */
export function httpErrorForCourseWrite(error: { code?: string | null; message?: string | null }): {
  statusCode: number
  statusMessage: string
} {
  const message = String(error.message || '')
  if (message.includes('courses_payment_method_check')) {
    return {
      statusCode: 400,
      statusMessage: 'Ungültige Zahlungsmethode. Erlaubt sind Online, Bar oder Rechnung.',
    }
  }
  return {
    statusCode: 500,
    statusMessage: error.message || 'Kurs konnte nicht gespeichert werden',
  }
}
