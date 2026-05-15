import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/update-participant-count
 * Updates the cached current_participants count on a course.
 *
 * Body:
 *   courseId – id of the course
 *   count    – new participant count
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { courseId, count } = await readBody(event) as { courseId: string; count: number }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })
  if (count === undefined || count === null) throw createError({ statusCode: 400, statusMessage: 'Missing count' })

  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('courses')
    .update({ current_participants: count })
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    logger.error('❌ Error updating participant count:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
