/**
 * Qualified PostgREST embeds for course_sessions.
 *
 * `courses → course_sessions` is defined by FK
 * `course_sessions_course_id_fkey` (course_sessions.course_id → courses.id).
 * Qualifying the hint prevents PostgREST from picking an ambiguous
 * relationship if additional FKs are added later (staff_id, created_by,
 * vehicle_id, etc. already exist on course_sessions).
 *
 * Do not invent a new constraint — this name is the existing schema FK.
 */

export const COURSE_SESSIONS_COURSE_FK = 'course_sessions_course_id_fkey' as const

/** `course_sessions!course_sessions_course_id_fkey(columns)` */
export function courseSessionsEmbed(columns: string): string {
  return `course_sessions!${COURSE_SESSIONS_COURSE_FK}(${columns})`
}

/** Public catalog / enrollment session columns — no instructor PII. */
export const PUBLIC_COURSE_SESSION_COLUMNS = [
  'id',
  'course_id',
  'tenant_id',
  'session_number',
  'start_time',
  'end_time',
  'sari_session_id',
  'allow_individual_booking',
  'individual_price_rappen',
  'individual_booking_requires_confirmation',
  'individual_booking_confirmation_text',
  'current_participants',
  'max_participants',
].join(', ')

export const ENROLL_COURSE_SESSION_COLUMNS = [
  'id',
  'course_id',
  'tenant_id',
  'session_number',
  'start_time',
  'end_time',
  'sari_session_id',
  'allow_individual_booking',
  'individual_price_rappen',
  'current_participants',
  'max_participants',
].join(', ')

export const CUSTOMER_COURSE_SESSION_COLUMNS = [
  'id',
  'course_id',
  'tenant_id',
  'start_time',
  'end_time',
  'session_number',
  'custom_location',
  'current_participants',
  'max_participants',
].join(', ')

export const CUSTOMER_REGISTRATION_COLUMNS = [
  'id',
  'course_id',
  'tenant_id',
  'user_id',
  'status',
  'payment_status',
  'registration_date',
  'custom_sessions',
  'is_partial_enrollment',
  'individual_session_number',
  'partial_start_session',
  'deleted_at',
].join(', ')
