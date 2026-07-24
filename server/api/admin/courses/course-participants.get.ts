import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/courses/course-participants?courseId=<id>
 * Returns confirmed registrations for a course (used for cancellation modal).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { courseId } = getQuery(event) as { courseId?: string }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const supabase = getSupabaseAdmin()

  // Verify course belongs to tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  const { data, error } = await supabase
    .from('course_registrations')
    .select('id, first_name, last_name, email, phone, user_id, status, tenant_id')
    .eq('course_id', courseId)
    .eq('status', 'confirmed')
    .is('deleted_at', null)

  if (error) {
    logger.error('❌ Error loading course participants:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data || []
})
