/**
 * Specification of the course_registrations payment/SARI freeze.
 * Production enforcement is the SQL trigger in
 * migrations/20260909_p0_09_course_registrations_rls.sql.
 * Tests use this replica so JWT injection behavior is asserted without a live DB.
 *
 * sari_synced_by is not included — the column does not exist in production.
 */
export const COURSE_REGISTRATION_PAYMENT_FIELDS = [
  'payment_status',
  'payment_id',
  'amount_paid_rappen',
  'payment_method',
  'discount_applied_rappen',
  'sari_data',
  'sari_synced',
  'sari_synced_at',
  'sari_faberid',
  'sari_license_id',
  'sari_licenses',
] as const

export type CourseRegistrationPaymentField =
  (typeof COURSE_REGISTRATION_PAYMENT_FIELDS)[number]

const JWT_INSERT_DEFAULTS: Record<CourseRegistrationPaymentField, unknown> = {
  payment_status: 'pending',
  payment_id: null,
  amount_paid_rappen: 0,
  payment_method: null,
  discount_applied_rappen: 0,
  sari_data: null,
  sari_synced: false,
  sari_synced_at: null,
  sari_faberid: null,
  sari_license_id: null,
  sari_licenses: null,
}

export function applyCourseRegistrationPaymentGuard<T extends Record<string, unknown>>(opts: {
  role: string
  op: 'INSERT' | 'UPDATE'
  oldRow?: T
  newRow: T
}): T {
  if (opts.role === 'service_role') {
    return opts.newRow
  }

  if (opts.op === 'INSERT') {
    return {
      ...opts.newRow,
      ...JWT_INSERT_DEFAULTS,
    }
  }

  const previous = opts.oldRow || ({} as T)
  const next = { ...opts.newRow }
  for (const field of COURSE_REGISTRATION_PAYMENT_FIELDS) {
    next[field] = previous[field] as T[Extract<keyof T, string>]
  }
  return next
}
