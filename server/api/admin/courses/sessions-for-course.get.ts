import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/courses/sessions-for-course?courseId=<id>
 * Returns all sessions for a course (must belong to tenant).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { courseId } = getQuery(event) as { courseId?: string }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const supabase = getSupabaseAdmin()

  // Verify course belongs to tenant
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (courseError || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const { data, error } = await supabase
    .from('course_sessions')
    .select('*, staff:users!staff_id(id, first_name, last_name)')
    .eq('course_id', courseId)
    .order('session_number', { ascending: true })

  if (error) {
    logger.error('❌ Error loading course sessions:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data || []
})
