import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

/**
 * GET /api/courses/enrollments?courseId=xxx&includeDeleted=true
 * Loads all registrations for a course (admin/staff only).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)

  const { courseId, includeDeleted } = getQuery(event)
  if (!courseId || typeof courseId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }

  const supabase = getSupabaseAdmin()

  // Verify the course belongs to the caller's tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const query = supabase
    .from('course_registrations')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (includeDeleted === 'true') {
    query.not('deleted_at', 'is', null)
  } else {
    query.is('deleted_at', null)
  }

  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data || []
})
