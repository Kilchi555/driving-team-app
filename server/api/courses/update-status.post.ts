import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

const VALID_STATUSES = ['draft', 'active', 'scheduled', 'completed', 'cancelled', 'waitlist'] as const
type CourseStatus = typeof VALID_STATUSES[number]

/**
 * POST /api/courses/update-status
 * Updates the status of a course (admin/staff only).
 * Uses service role key to avoid client-side RLS/JWT expiry issues.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)

  const body = await readBody<{ courseId: string; status: CourseStatus }>(event)

  if (!body?.courseId) {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }
  if (!body?.status || !VALID_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
  }

  const supabase = getSupabaseAdmin()

  // Verify course belongs to the caller's tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id, tenant_id, status, name')
    .eq('id', body.courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const updateData: Record<string, any> = {
    status: body.status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: profile.id,
  }

  if (body.status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
    updateData.cancelled_by = profile.id
  }

  const { data: updated, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', body.courseId)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Status update failed: ${error.message}` })
  }

  return { success: true, course: updated }
})
