/**
 * Pure resolver for public course-invoice timing.
 * No database access. Unknown modes fail closed.
 */

export type ResolvedCourseInvoiceTiming = 'off' | 'immediate' | 'unsupported'

export function resolveCourseInvoiceTiming(input: {
  courseMode?: string | null
  categoryMode: string | null | undefined
  tenantMode: string | null | undefined
}): ResolvedCourseInvoiceTiming {
  const course = normalizeMode(input.courseMode)
  if (course === 'immediate') return 'immediate'
  if (course !== '') return 'unsupported'

  const category = normalizeMode(input.categoryMode)
  if (category === 'off') return 'off'
  if (category === 'immediate') return 'immediate'
  if (category !== 'inherit') return 'unsupported'

  const tenant = normalizeMode(input.tenantMode)
  if (tenant === 'off') return 'off'
  if (tenant === 'immediate') return 'immediate'
  return 'unsupported'
}

export function normalizeCourseInvoiceTimingForSave(input: {
  paymentMethod: unknown
  invoiceTimingMode: unknown
}): { invoice_timing_mode: 'immediate' | null } | { error: string } {
  const method = typeof input.paymentMethod === 'string' ? input.paymentMethod.trim() : ''
  if (method !== 'INVOICE') return { invoice_timing_mode: null }

  if (input.invoiceTimingMode == null) return { invoice_timing_mode: null }
  if (typeof input.invoiceTimingMode !== 'string') {
    return { error: 'Ungültige Rechnungsstellung. Erlaubt sind Standard oder Sofort.' }
  }
  const mode = input.invoiceTimingMode.trim().toLowerCase()
  if (mode === '') return { invoice_timing_mode: null }
  if (mode === 'immediate') return { invoice_timing_mode: 'immediate' }
  return { error: 'Ungültige Rechnungsstellung. Erlaubt sind Standard oder Sofort.' }
}

function normalizeMode(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).trim().toLowerCase()
}
