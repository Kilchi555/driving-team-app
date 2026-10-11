/**
 * Category-level Standard-Zahlungsart helpers.
 * Kept free of Nuxt/server imports so Vitest can unit-test inheritance rules.
 */
import {
  mapTenantDefaultToCoursePaymentMethod,
  type CoursePaymentMethod,
} from '~/utils/courseLocationUtils'

export const CATEGORY_DEFAULT_PAYMENT_METHODS = ['WALLEE', 'CASH_ON_SITE', 'INVOICE'] as const

export type CategoryDefaultPaymentMethod = (typeof CATEGORY_DEFAULT_PAYMENT_METHODS)[number]

/**
 * Message for customer-facing payment-option gates (booking/enrollment).
 * Admin category/course Standard-Zahlungsart overrides must not use this as a
 * save blocker — that toggle only controls whether customers may choose invoice.
 */
export const INVOICE_PAYMENT_DISABLED_MESSAGE =
  'Rechnung kann nicht gespeichert werden: „Rechnung als Zahlungsoption erlauben“ ist in den Zahlungseinstellungen deaktiviert. Bitte aktivieren Sie die Option dort oder wählen Sie eine andere Zahlungsart.'

export function isCategoryDefaultPaymentMethod(
  value: unknown,
): value is CategoryDefaultPaymentMethod {
  return value === 'WALLEE' || value === 'CASH_ON_SITE' || value === 'INVOICE'
}

/**
 * Parse API/UI input for course_categories.default_payment_method.
 * null / undefined / '' → NULL (Mandantenstandard).
 */
export function parseCategoryDefaultPaymentMethod(
  value: unknown,
): CategoryDefaultPaymentMethod | null {
  if (value === null || value === undefined || value === '') return null
  if (isCategoryDefaultPaymentMethod(value)) return value
  throw new Error(
    'Ungültige Standard-Zahlungsart. Erlaubt sind Mandantenstandard, Online-Zahlung, Barzahlung oder Rechnung.',
  )
}

/**
 * Parse courses.payment_method on admin upsert.
 * null / undefined / '' → NULL (resolve from category/tenant on create only).
 */
export function parseCoursePaymentMethodInput(
  value: unknown,
): CoursePaymentMethod | null {
  if (value === null || value === undefined || value === '') return null
  if (value === 'WALLEE' || value === 'CASH_ON_SITE' || value === 'INVOICE') {
    return value
  }
  throw new Error(
    'Ungültige Zahlungsart. Erlaubt sind Online-Zahlung, Barzahlung oder Rechnung.',
  )
}

/**
 * Resolve the payment method for a newly created course.
 * Category non-null wins; NULL falls back to the existing tenant mapping.
 */
export function resolveNewCoursePaymentMethod(opts: {
  categoryDefaultPaymentMethod: CategoryDefaultPaymentMethod | null | undefined
  tenantDefaultPaymentMethod: string | null | undefined
}): CoursePaymentMethod {
  if (isCategoryDefaultPaymentMethod(opts.categoryDefaultPaymentMethod)) {
    return opts.categoryDefaultPaymentMethod
  }
  return mapTenantDefaultToCoursePaymentMethod(opts.tenantDefaultPaymentMethod)
}

/**
 * Interaction rule for the admin create-course form:
 * - Category selection/change always applies the category (or tenant) default.
 * - Manual payment edits are respected until the category changes again.
 */
export function shouldApplyCategoryPaymentDefault(opts: {
  categoryChanged: boolean
  paymentManuallyEdited: boolean
}): boolean {
  if (opts.categoryChanged) return true
  return !opts.paymentManuallyEdited
}

/**
 * Fail closed when a customer-facing flow would take INVOICE while the tenant
 * "Rechnung als Zahlungsoption erlauben" toggle is off.
 * Does not silently downgrade to Wallee/cash.
 * Not used to block admin category/course payment-method overrides.
 */
export function assertInvoicePaymentMethodAllowed(opts: {
  paymentMethod: string | null | undefined
  invoicePaymentsEnabled: boolean
}): void {
  if (opts.paymentMethod === 'INVOICE' && opts.invoicePaymentsEnabled !== true) {
    throw new Error(INVOICE_PAYMENT_DISABLED_MESSAGE)
  }
}
