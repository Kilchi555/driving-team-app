/**
 * Utility functions for course location handling and payment method determination
 */

/**
 * Extract city name from course description or location string
 */
export function extractCityFromCourseDescription(description: string): string | null {
  if (!description) return null
  
  const lowerDesc = description.toLowerCase()
  
  // Check for known cities
  if (lowerDesc.includes('zürich') || lowerDesc.includes('zurich') || lowerDesc.includes('zuerich')) {
    return 'Zürich'
  }
  if (lowerDesc.includes('lachen')) {
    return 'Lachen'
  }
  if (lowerDesc.includes('einsiedeln')) {
    return 'Einsiedeln'
  }
  if (lowerDesc.includes('schwyz')) {
    return 'Schwyz'
  }
  
  return null
}

export type CoursePaymentMethod = 'WALLEE' | 'CASH_ON_SITE' | 'INVOICE'

/**
 * Determine payment method based on location and tenant Wallee status.
 *
 * Source of truth: `server/api/courses/enroll-cash.post.ts` rejects cash for
 * any course whose city is not "Einsiedeln" UNLESS the tenant has no Wallee
 * activated at all. To keep UI and server consistent:
 *   - Einsiedeln → always CASH_ON_SITE
 *   - Any other city → CASH_ON_SITE if walleeEnabled is explicitly false
 *     (since the tenant has no other payment option), otherwise WALLEE.
 *
 * `walleeEnabled` is optional for backwards compatibility; when omitted the
 * function defaults to the historical behavior (everything except Einsiedeln
 * uses Wallee).
 */
export function determinePaymentMethod(
  city: string | null,
  walleeEnabled?: boolean
): CoursePaymentMethod {
  if (city && city.toLowerCase() === 'einsiedeln') {
    return 'CASH_ON_SITE'
  }

  if (walleeEnabled === false) {
    return 'CASH_ON_SITE'
  }

  return 'WALLEE'
}

/**
 * Determine payment method for a course, honoring the admin-controlled
 * override `courses.payment_method` when set. Falls back to the automatic
 * city/wallee-based logic when the column is NULL.
 *
 * This is the single entry point that UI and server-side handlers should
 * call so that admin overrides, city-based defaults and tenant Wallee
 * status are evaluated consistently.
 *
 * `invoiceEnabled` mirrors `walleeEnabled`: it reflects the tenant-wide
 * "Rechnung als Zahlungsoption erlauben" toggle. A course explicitly set to
 * INVOICE degrades to the automatic WALLEE/CASH_ON_SITE logic if the tenant
 * has since disabled invoice payments — so enrollment never gets stuck on a
 * payment method nobody can select.
 */
export function getCoursePaymentMethod(
  course: {
    payment_method?: CoursePaymentMethod | string | null
    city?: string | null
    description?: string | null
    name?: string | null
  } | null | undefined,
  walleeEnabled?: boolean,
  invoiceEnabled?: boolean
): CoursePaymentMethod {
  const explicit = course?.payment_method
  if (explicit === 'WALLEE' || explicit === 'CASH_ON_SITE') {
    // Admin override wins, BUT we still degrade to cash if the tenant has
    // no Wallee activated at all — otherwise the enrollment would fail at
    // the payment step.
    if (explicit === 'WALLEE' && walleeEnabled === false) {
      return 'CASH_ON_SITE'
    }
    return explicit
  }
  if (explicit === 'INVOICE') {
    if (invoiceEnabled === false) {
      const city = course?.city || extractCityFromCourseDescription(course?.description || course?.name || '')
      return determinePaymentMethod(city, walleeEnabled)
    }
    return 'INVOICE'
  }

  const city = course?.city || extractCityFromCourseDescription(course?.description || course?.name || '')
  return determinePaymentMethod(city, walleeEnabled)
}

/**
 * Get human-readable label for payment method
 */
export function getPaymentMethodLabel(method: CoursePaymentMethod): string {
  switch (method) {
    case 'WALLEE':
      return 'Online-Zahlung (Kreditkarte, TWINT)'
    case 'CASH_ON_SITE':
      return 'Barzahlung vor Ort'
    case 'INVOICE':
      return 'Rechnung'
    default:
      return 'Zahlung'
  }
}

/**
 * Get description for payment method
 */
export function getPaymentMethodDescription(method: CoursePaymentMethod): string {
  switch (method) {
    case 'WALLEE':
      return 'Du wirst nach der Anmeldung zur sicheren Zahlungsseite weitergeleitet.'
    case 'CASH_ON_SITE':
      return 'Bitte bringe den Betrag passend in bar zum ersten Kurstag mit.'
    case 'INVOICE':
      return 'Du erhältst die Rechnung nach der Anmeldung per E-Mail.'
    default:
      return ''
  }
}

