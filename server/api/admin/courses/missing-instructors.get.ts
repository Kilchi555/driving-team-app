import { defineEventHandler } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/admin/courses/missing-instructors
 * Returns all active SARI-managed courses that have at least one upcoming
 * session without an instructor assigned. Used for the Pendenzen widget.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data: rows, error } = await supabase
    .from('course_sessions')
    .select(`
      id,
      course_id,
      start_time,
      session_number,
      courses!inner(id, name, sari_managed, status, tenant_id, course_category:course_categories(name, color))
    `)
    .eq('courses.tenant_id', profile.tenant_id)
    .eq('courses.sari_managed', true)
    .neq('courses.status', 'cancelled')
    .is('staff_id', null)
    .is('external_instructor_name', null)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  if (error) {
    return { courses: [] }
  }

  // Aggregate by course
  const byCoursemap = new Map<string, {
    courseId: string
    courseName: string
    categoryName: string | null
    categoryColor: string | null
    firstSession: string
    sessionCount: number
  }>()

  for (const row of (rows || [])) {
    const course = row.courses as any
    if (!byCoursemap.has(row.course_id)) {
      byCoursemap.set(row.course_id, {
        courseId: row.course_id,
        courseName: course.name,
        categoryName: course.course_category?.name ?? null,
        categoryColor: course.course_category?.color ?? null,
        firstSession: row.start_time,
        sessionCount: 1,
      })
    } else {
      byCoursemap.get(row.course_id)!.sessionCount++
    }
  }

  return {
    courses: Array.from(byCoursemap.values()).sort((a, b) =>
      a.firstSession.localeCompare(b.firstSession),
    ),
  }
})
