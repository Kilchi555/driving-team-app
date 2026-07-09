import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/tenant/instructor-confirmation-setting
 * Returns the current instructor confirmation setting for the tenant
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('require_instructor_confirmation')
    .eq('id', profile.tenant_id)
    .single()

  if (error) {
    logger.error('Error fetching tenant setting:', error)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Einstellung' })
  }

  return {
    require_instructor_confirmation: tenant?.require_instructor_confirmation ?? true,
  }
})
