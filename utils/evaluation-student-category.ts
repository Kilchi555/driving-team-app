/** First license / category code from users.category (string, CSV, or array). */
export function firstCategoryCode(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim()
  if (typeof raw === 'string') return raw.split(',')[0]?.trim() || ''
  if (raw != null && raw !== '') return String(raw).trim()
  return ''
}

/**
 * Category passed into EvaluationModal / notes.student_category.
 * Driving schools keep the A/B/BE fallback. Other verticals never invent a license code.
 */
export function resolveEvaluationStudentCategory(opts: {
  isDrivingSchool: boolean
  appointmentType?: string | null
  type?: string | null
  eventTypeCode?: string | null
  userCategory?: unknown
}): string {
  const fromAppointment = String(opts.appointmentType || opts.type || '').trim()
  const fromEvent = String(opts.eventTypeCode || '').trim()
  const fromUser = firstCategoryCode(opts.userCategory)

  if (opts.isDrivingSchool) {
    if (fromAppointment && fromAppointment !== 'A') return fromAppointment
    if (fromUser) return fromUser
    return fromAppointment || 'A'
  }

  return fromAppointment || fromEvent || fromUser
}
