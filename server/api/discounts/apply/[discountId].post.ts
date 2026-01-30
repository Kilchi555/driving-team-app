import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * POST /api/discounts/apply/:discountId
 * Apply a discount and increment usage count
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) {
      throw createError({ statusCode: 401, statusMessage: 'User has no tenant assigned' })
    }

    const discountId = getRouterParam(event, 'discountId')
    if (!discountId) {
      throw createError({ statusCode: 400, statusMessage: 'Discount ID is required' })
    }

    logger.debug('🔄 Applying discount:', discountId)

    const supabaseAdmin = getSupabaseAdmin()

    // Get current usage count
    const { data: currentDiscount, error: getError } = await supabaseAdmin
      .from('discounts')
      .select('usage_count')
      .eq('id', discountId)
      .eq('tenant_id', authUser.tenant_id)
      .maybeSingle()

    if (getError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to get discount: ${getError.message}` })
    }

    if (!currentDiscount) {
      throw createError({ statusCode: 404, statusMessage: 'Discount not found' })
    }

    const newCount = (currentDiscount.usage_count || 0) + 1

    // Update usage count
    const { error: updateError } = await supabaseAdmin
      .from('discounts')
      .update({ 
        usage_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', discountId)
      .eq('tenant_id', authUser.tenant_id)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to apply discount: ${updateError.message}` })
    }

    logger.debug('✅ Discount applied:', discountId, 'new count:', newCount)

    return {
      success: true,
      discount_id: discountId,
      usage_count: newCount
    }
  } catch (err: any) {
    logger.error('❌ Error in POST /api/discounts/apply/:discountId:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to apply discount'
    })
  }
})
