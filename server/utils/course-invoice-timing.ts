/**
 * Pure resolver for public course-invoice timing.
 * No database access. Unknown modes fail closed.
 */

export type ResolvedCourseInvoiceTiming = 'off' | 'immediate' | 'unsupported'

export function resolveCourseInvoiceTiming(input: {
  categoryMode: string | null | undefined
  tenantMode: string | null | undefined
}): ResolvedCourseInvoiceTiming {
  const category = normalizeMode(input.categoryMode)
  if (category === 'off') return 'off'
  if (category === 'immediate') return 'immediate'
  if (category !== 'inherit') return 'unsupported'

  const tenant = normalizeMode(input.tenantMode)
  if (tenant === 'off') return 'off'
  if (tenant === 'immediate') return 'immediate'
  return 'unsupported'
}

function normalizeMode(value: string | null | undefined): string {
  if (value == null) return ''
  return String(value).trim().toLowerCase()
}
