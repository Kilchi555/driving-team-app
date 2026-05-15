import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/restore-participant
 * Restores a soft-deleted course registration by clearing deleted_at / deleted_by.
 *
 * Body:
 *   enrollmentId – id of the course_registrations row
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { enrollmentId } = await readBody(event) as { enrollmentId: string }

  if (!enrollmentId) throw createError({ statusCode: 400, statusMessage: 'Missing enrollmentId' })

  const supabase = getSupabaseAdmin()

  // Verify registration belongs to tenant
  const { data: reg } = await supabase
    .from('course_registrations')
    .select('id, tenant_id')
    .eq('id', enrollmentId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!reg) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  const { error } = await supabase
    .from('course_registrations')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', enrollmentId)

  if (error) {
    logger.error('❌ Error restoring participant:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  logger.debug('✅ Participant restored:', enrollmentId)
  return { success: true }
})
