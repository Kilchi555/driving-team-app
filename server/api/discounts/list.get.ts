import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * GET /api/discounts/list
 * Fetch all active discounts for the authenticated user's tenant
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) {
      throw createError({ statusCode: 401, statusMessage: 'User has no tenant assigned' })
    }

    logger.debug('🔍 Loading discounts for tenant:', authUser.tenant_id)

    const supabaseAdmin = getSupabaseAdmin()
    const { data: discounts, error } = await supabaseAdmin
      .from('discounts')
      .select('*')
      .eq('tenant_id', authUser.tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('❌ Database error loading discounts:', error.message)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load discounts: ${error.message}`
      })
    }

    logger.debug('✅ Loaded discounts:', discounts?.length || 0)

    return {
      success: true,
      data: discounts || [],
      count: (discounts || []).length
    }
  } catch (err: any) {
    logger.error('❌ Error in GET /api/discounts/list:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load discounts'
    })
  }
})
