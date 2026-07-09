import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * PUT /api/admin/tenant/instructor-confirmation-setting
 * Updates the instructor confirmation setting for the tenant
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { require_instructor_confirmation } = body as {
    require_instructor_confirmation: boolean
  }

  if (typeof require_instructor_confirmation !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage: 'require_instructor_confirmation muss ein Boolean sein',
    })
  }

  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('tenants')
    .update({ require_instructor_confirmation })
    .eq('id', profile.tenant_id)

  if (error) {
    logger.error('Error updating tenant setting:', error)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern der Einstellung' })
  }

  logger.debug(`✅ Instructor confirmation setting updated: ${require_instructor_confirmation}`)

  return {
    success: true,
    require_instructor_confirmation,
  }
})
