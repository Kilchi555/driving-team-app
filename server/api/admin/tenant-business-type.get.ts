import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/tenant-business-type
 * Returns the business_type for the current admin's tenant.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('tenants')
    .select('business_type')
    .eq('id', profile.tenant_id)
    .single()

  if (error) {
    logger.error('❌ Error loading tenant business type:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { business_type: data?.business_type || null }
})
