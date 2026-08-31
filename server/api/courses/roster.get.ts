import { defineEventHandler, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { loadCourseRoster } from '~/server/utils/course-roster'

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

  return loadCourseRoster(getSupabaseAdmin(), profile, {
    courseId: typeof courseIdParam === 'string' ? courseIdParam : null,
    appointmentId: typeof appointmentId === 'string' ? appointmentId : null,
  })
})
