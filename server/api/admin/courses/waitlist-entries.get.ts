/**
 * GET /api/admin/courses/waitlist-entries?courseId=xxx
 * Returns waitlist entries for a specific course (admin only).
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { courseId } = getQuery(event)

  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: course } = await supabase
    .from('courses')
    .select('id, tenant_id, name')
    .eq('id', courseId as string)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const { data: entries, error } = await supabase
    .from('course_waitlist')
    .select('id, first_name, last_name, email, phone, position, status, added_date')
    .eq('course_id', courseId as string)
    .in('status', ['waiting', 'offered'])
    .order('position', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { entries: entries || [] }
})
