import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { matchesDiscountCategoryFilter } from '~/server/utils/discount-category-filter'

/**
 * GET /api/discounts/by-category/:categoryCode
 * Fetch discounts for a specific category
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) {
      throw createError({ statusCode: 401, statusMessage: 'User has no tenant assigned' })
    }

    const categoryCode = getRouterParam(event, 'categoryCode')
    if (!categoryCode) {
      throw createError({ statusCode: 400, statusMessage: 'Category code is required' })
    }

    logger.debug('🔍 Loading discounts for category:', categoryCode, 'tenant:', authUser.tenant_id)

    const supabaseAdmin = getSupabaseAdmin()
    const { data: discounts, error } = await supabaseAdmin
      .from('discounts')
      .select('*')
      .eq('tenant_id', authUser.tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('❌ Database error loading category discounts:', error.message)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load discounts: ${error.message}`
      })
    }

    const filtered = (discounts || []).filter((d: any) =>
      matchesDiscountCategoryFilter(d.category_filter, categoryCode)
    )

    logger.debug('✅ Loaded category discounts:', filtered.length)

    return {
      success: true,
      data: filtered,
      count: filtered.length
    }
  } catch (err: any) {
    logger.error('❌ Error in GET /api/discounts/by-category/:categoryCode:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load discounts'
    })
  }
})
