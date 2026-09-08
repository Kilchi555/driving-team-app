/** Public-safe course_sessions fields. Internal SARI / instructor PII stay off this list. */

export const PUBLIC_COURSE_SESSION_COLUMNS = [
  'id',
  'start_time',
  'end_time',
  'session_number',
  'allow_individual_booking',
  'individual_price_rappen',
  'individual_booking_requires_confirmation',
  'individual_booking_confirmation_text',
  'current_participants',
  'max_participants',
] as const

export function sanitizePublicCourseSessions(sessions: any[] | null | undefined) {
  return (sessions || []).map((session) => {
    const out: Record<string, any> = {}
    for (const column of PUBLIC_COURSE_SESSION_COLUMNS) {
      out[column] = session[column]
    }
    return out
  })
}
