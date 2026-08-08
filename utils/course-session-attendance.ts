/**
 * Helpers for which course registrations attend which Kursteil.
 *
 * "Teil N" is the chronological day-position (1-based) across sessions
 * grouped by calendar date — same logic as enroll-wallee partial filtering.
 * SARI session_number values can be weird (e.g. -100001), so day position
 * is the reliable match for partial_start_session / individual bookings.
 */

export type SessionAttendanceSession = {
  id?: string
  session_number?: number | null
  start_time: string
  end_time?: string | null
}

export type RegistrationAttendance = {
  is_partial_enrollment?: boolean | null
  partial_start_session?: number | null
  individual_session_number?: number | null
  custom_sessions?: Record<string, unknown> | null
}

function sessionDateKey(startTime: string): string {
  // Accept both "2026-08-15T05:30:00+00:00" and "2026-08-15 05:30:00+00"
  const normalized = String(startTime).replace(' ', 'T')
  return normalized.slice(0, 10)
}

/** Assign Teil position (1, 2, 3…) by unique session dates ascending. */
export function assignSessionDayPositions<T extends SessionAttendanceSession>(
  sessions: T[],
): Array<T & { teil: number; dateKey: string }> {
  const sorted = [...sessions]
    .filter((s) => s?.start_time)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))

  let pos = 0
  let lastDate = ''
  return sorted.map((s) => {
    const dateKey = sessionDateKey(s.start_time)
    if (dateKey !== lastDate) {
      pos += 1
      lastDate = dateKey
    }
    return { ...s, teil: pos, dateKey }
  })
}

/**
 * Whether a registration attends the given Kursteil (day position).
 * Optionally also checks against the raw session_number for individual bookings.
 */
export function registrationAttendsTeil(
  reg: RegistrationAttendance,
  teil: number,
  sessionNumber?: number | null,
): boolean {
  if (reg.individual_session_number != null) {
    const n = reg.individual_session_number
    if (sessionNumber != null && n === sessionNumber) return true
    return n === teil
  }

  if (reg.partial_start_session != null) {
    if (teil < reg.partial_start_session) return false
  } else if (reg.is_partial_enrollment) {
    // Fallback when partial flag is set but start session missing (historically Teil 3)
    if (teil < 3) return false
  }

  const custom = reg.custom_sessions
  if (custom && typeof custom === 'object') {
    // Swap-out for this Teil → not on this course's roster for that day
    if (custom[String(teil)] != null) return false
    if (sessionNumber != null && custom[String(sessionNumber)] != null) return false
  }

  return true
}

export function partialEnrollmentBadgeLabel(reg: RegistrationAttendance): string | null {
  if (reg.individual_session_number != null) {
    return `Nur Teil ${reg.individual_session_number}`
  }
  if (reg.is_partial_enrollment || reg.partial_start_session != null) {
    const start = reg.partial_start_session ?? 3
    return `Nur Teil ${start}`
  }
  return null
}

/** Sessions that fall on the same Zurich/calendar day as the appointment start. */
export function sessionsMatchingAppointmentDay<T extends SessionAttendanceSession>(
  sessions: T[],
  appointmentStart: string,
): T[] {
  const aptDate = sessionDateKey(appointmentStart)
  return sessions.filter((s) => sessionDateKey(s.start_time) === aptDate)
}
