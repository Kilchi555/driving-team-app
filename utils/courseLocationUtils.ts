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
export type CoursePaymentMethodSource = 'course' | 'category' | 'tenant'

export function parseCoursePaymentMethodOverride(value: unknown): CoursePaymentMethod | null {
  if (value === 'WALLEE' || value === 'CASH_ON_SITE' || value === 'INVOICE') return value
  return null
}

/** Tenant payment settings use lowercase keys; courses store the uppercase enum. */
export function mapTenantDefaultToCoursePaymentMethod(
  tenantDefault: string | null | undefined
): CoursePaymentMethod {
  if (tenantDefault === 'cash' || tenantDefault === 'CASH_ON_SITE') return 'CASH_ON_SITE'
  if (tenantDefault === 'invoice' || tenantDefault === 'INVOICE') return 'INVOICE'
  if (tenantDefault === 'wallee' || tenantDefault === 'WALLEE') return 'WALLEE'
  return 'WALLEE'
}

/**
 * Configuration only: course override → category override → tenant default.
 * NULL at course/category means inherit. Does not apply availability gates.
 */
export function resolveConfiguredCoursePaymentMethod(opts: {
  coursePaymentMethod?: unknown
  categoryPaymentMethod?: unknown
  tenantDefault?: unknown
}): { paymentMethod: CoursePaymentMethod; source: CoursePaymentMethodSource } {
  const course = parseCoursePaymentMethodOverride(opts.coursePaymentMethod)
  if (course) return { paymentMethod: course, source: 'course' }
  const category = parseCoursePaymentMethodOverride(opts.categoryPaymentMethod)
  if (category) return { paymentMethod: category, source: 'category' }
  return {
    paymentMethod: mapTenantDefaultToCoursePaymentMethod(
      typeof opts.tenantDefault === 'string' ? opts.tenantDefault : null
    ),
    source: 'tenant',
  }
}

/**
 * Availability/security layer on top of a configured method.
 * Einsiedeln city-auto remains only as the Wallee/invoice-disabled degrade path.
 */
export function applyCoursePaymentAvailability(opts: {
  configured: CoursePaymentMethod
  walleeEnabled?: boolean
  invoiceEnabled?: boolean
  city?: string | null
  description?: string | null
  name?: string | null
}): CoursePaymentMethod {
  const explicit = opts.configured
  if (explicit === 'WALLEE' || explicit === 'CASH_ON_SITE') {
    if (explicit === 'WALLEE' && opts.walleeEnabled === false) {
      return 'CASH_ON_SITE'
    }
    return explicit
  }
  if (explicit === 'INVOICE') {
    if (opts.invoiceEnabled === false) {
      const city = opts.city || extractCityFromCourseDescription(opts.description || opts.name || '')
      return determinePaymentMethod(city, opts.walleeEnabled)
    }
    return 'INVOICE'
  }
  return explicit
}

/** Admin-Anmeldung: vorausgewählte Option aus der Kurs-Zahlungsart. */
export function coursePaymentMethodToAdminEnrollmentOption(
  method: CoursePaymentMethod,
  walleeEnabled?: boolean
): 'cash' | 'invoice' | 'online_link' {
  if (method === 'INVOICE') return 'invoice'
  if (method === 'CASH_ON_SITE') return 'cash'
  if (walleeEnabled === false) return 'cash'
  return 'online_link'
}

/** Firmen-Sammelrechnung bleibt Rechnung; sonst Kurs-Zahlungsart (inkl. Automatisch). */
export function defaultAdminEnrollmentPaymentOption(
  course: {
    payment_method?: CoursePaymentMethod | string | null
    city?: string | null
    description?: string | null
    name?: string | null
    billing_mode?: string | null
    company_id?: string | null
  } | null | undefined,
  walleeEnabled?: boolean,
  invoiceEnabled?: boolean
): 'cash' | 'invoice' | 'online_link' {
  if (course?.billing_mode === 'company_collective' && course?.company_id) {
    return 'invoice'
  }
  const method = getCoursePaymentMethod(course, walleeEnabled, invoiceEnabled)
  return coursePaymentMethodToAdminEnrollmentOption(method, walleeEnabled)
}

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
 * Used only as an availability degrade when Wallee/invoice is disabled —
 * not as the configuration fallback (that is now tenant default).
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
 * Display/UI helper: configured hierarchy, then availability gates.
 *
 * Configuration (NULL = inherit):
 *   course.payment_method → category.payment_method → tenant default
 *
 * Availability:
 *   WALLEE with walleeEnabled === false → CASH_ON_SITE
 *   INVOICE with invoiceEnabled === false → city/Wallee degrade (Einsiedeln cash)
 *
 * Server enrollment must call resolveEffectiveCoursePaymentMethod, not this.
 */
export function getCoursePaymentMethod(
  course: {
    payment_method?: CoursePaymentMethod | string | null
    city?: string | null
    description?: string | null
    name?: string | null
    course_category?: { payment_method?: CoursePaymentMethod | string | null } | null
    category_payment_method?: CoursePaymentMethod | string | null
    tenant_default_payment_method?: string | null
  } | null | undefined,
  walleeEnabled?: boolean,
  invoiceEnabled?: boolean,
  tenantDefault?: string | null
): CoursePaymentMethod {
  const configured = resolveConfiguredCoursePaymentMethod({
    coursePaymentMethod: course?.payment_method,
    categoryPaymentMethod:
      course?.course_category?.payment_method
      ?? course?.category_payment_method,
    tenantDefault: tenantDefault ?? course?.tenant_default_payment_method,
  })
  return applyCoursePaymentAvailability({
    configured: configured.paymentMethod,
    walleeEnabled,
    invoiceEnabled,
    city: course?.city,
    description: course?.description,
    name: course?.name,
  })
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

