import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { parseCourseIdFromAppointmentNotes } from '~/utils/course-appointment'
import {
  assignSessionDayPositions,
  registrationAttendsTeil,
  sessionsMatchingAppointmentDay,
  partialEnrollmentBadgeLabel,
} from '~/utils/course-session-attendance'

/**
 * GET /api/courses/roster?courseId=xxx
 * GET /api/courses/roster?appointmentId=xxx
 *
 * Returns course + sessions + enrollments for the staff calendar roster modal.
 * When appointmentId is set, participants are filtered to those attending
 * the Kursteil(e) of that calendar day (partial / individual bookings respected).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { courseId: courseIdParam, appointmentId } = getQuery(event)

  const supabase = getSupabaseAdmin()
  let courseId: string | null = typeof courseIdParam === 'string' ? courseIdParam : null
  let appointmentStart: string | null = null
  let appointmentEnd: string | null = null

  if (typeof appointmentId === 'string') {
    const { data: apt, error: aptError } = await supabase
      .from('appointments')
      .select('id, notes, staff_id, tenant_id, event_type_code, start_time, end_time')
      .eq('id', appointmentId)
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (aptError || !apt) {
      throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
    }

    const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(profile.role)
    if (!isAdmin && apt.staff_id !== profile.id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    if (!courseId) {
      courseId = parseCourseIdFromAppointmentNotes(apt.notes)
    }
    if (!courseId) {
      throw createError({ statusCode: 400, statusMessage: 'Appointment is not linked to a course' })
    }

    appointmentStart = apt.start_time
    appointmentEnd = apt.end_time
  }

  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'courseId or appointmentId is required' })
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      status,
      city,
      description,
      course_sessions (
        id,
        session_number,
        start_time,
        end_time,
        staff_id,
        instructor_type,
        external_instructor_name,
        staff:users!staff_id(id, first_name, last_name)
      )
    `)
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (courseError || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const isAdmin = ['admin', 'super_admin', 'tenant_admin'].includes(profile.role)
  if (!isAdmin) {
    const { data: ownAppt } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('staff_id', profile.id)
      .eq('notes', `course:${courseId}`)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    const rawSessions = (course as any).course_sessions || []
    const isSessionInstructor = rawSessions.some((s: any) => s.staff_id === profile.id)

    if (!ownAppt && !isSessionInstructor) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – not assigned to this course' })
    }
  }

  const { data: participants, error: partError } = await supabase
    .from('course_registrations')
    .select('id, first_name, last_name, email, phone, status, payment_status, is_partial_enrollment, partial_start_session, individual_session_number, custom_sessions, registration_date')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (partError) {
    throw createError({ statusCode: 500, statusMessage: partError.message })
  }

  const sessionsWithTeil = assignSessionDayPositions((course as any).course_sessions || [])

  // Focus on the Kursteil(e) covered by the clicked staff appointment
  let focusSessions = sessionsWithTeil
  let filterByFocus = false
  if (appointmentStart) {
    const daySessions = sessionsMatchingAppointmentDay(sessionsWithTeil, appointmentStart)
    if (daySessions.length > 0) {
      focusSessions = daySessions
      filterByFocus = true
    }
  }

  const focusTeils = [...new Set(focusSessions.map((s) => s.teil))]

  const mappedParticipants = (participants || []).map((p: any) => ({
    ...p,
    partial_label: partialEnrollmentBadgeLabel(p),
  }))

  const filteredParticipants = filterByFocus
    ? mappedParticipants.filter((p: any) =>
        focusTeils.some((teil) => {
          const sess = focusSessions.find((s) => s.teil === teil)
          return registrationAttendsTeil(p, teil, sess?.session_number)
        }),
      )
    : mappedParticipants

  return {
    course: {
      id: course.id,
      name: course.name,
      status: course.status,
      city: (course as any).city || null,
      description: (course as any).description || null,
      // Full course sessions (with teil) — PDF always uses the whole course
      course_sessions: sessionsWithTeil,
    },
    // Sessions for this appointment day — modal list only
    focus_sessions: focusSessions,
    focus_teils: focusTeils,
    filtered_by_session: filterByFocus,
    appointment: appointmentStart
      ? { start_time: appointmentStart, end_time: appointmentEnd }
      : null,
    // Session-filtered for the modal UI
    participants: filteredParticipants,
    // Full roster for the course PDF (same as admin)
    all_participants: mappedParticipants,
  }
})
