/**
 * POST /api/admin/courses/cleanup-cancelled-staff
 *
 * For an already-cancelled course: remove staff calendar blocks tagged
 * `course:<id>` and optionally email the assigned instructors.
 *
 * Body: { courseId: string, notifyStaff?: boolean }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  deleteStaffCourseAppointments,
  notifyStaffCourseCancelled,
} from '~/server/utils/course-staff-notifications'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseId, notifyStaff = true } = body as {
    courseId: string
    notifyStaff?: boolean
  }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const supabase = getSupabaseAdmin()

  const { data: course } = await supabase
    .from('courses')
    .select('id, name, tenant_id, status')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  if (course.status !== 'cancelled') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Course is not cancelled — use cancel-course instead',
    })
  }

  const { data: staffSessions } = await supabase
    .from('course_sessions')
    .select('id, start_time, end_time, description, staff_id')
    .eq('course_id', courseId)
    .not('staff_id', 'is', null)

  const byStaff = new Map<string, typeof staffSessions>()
  for (const s of staffSessions || []) {
    if (!s.staff_id) continue
    if (!byStaff.has(s.staff_id)) byStaff.set(s.staff_id, [])
    byStaff.get(s.staff_id)!.push(s)
  }

  let instructorsCleared = 0
  let notified = 0

  for (const [staffId, sessions] of byStaff) {
    await deleteStaffCourseAppointments(supabase, staffId, courseId)
    instructorsCleared++
    if (notifyStaff && sessions?.length) {
      await notifyStaffCourseCancelled(
        supabase,
        staffId,
        { id: course.id, name: course.name, tenant_id: course.tenant_id },
        sessions,
      )
      notified++
    }
  }

  const { data: leftover } = await supabase
    .from('appointments')
    .delete()
    .eq('notes', `course:${courseId}`)
    .select('id')

  if (leftover?.length) {
    logger.debug(`🧹 Removed ${leftover.length} leftover appointment(s) for cancelled course ${courseId}`)
  }

  return {
    success: true,
    instructorsCleared,
    notified,
    leftoverRemoved: leftover?.length || 0,
  }
})
