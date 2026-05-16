import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * GET /api/discounts/my-auto-discounts
 *
 * Returns all active auto-apply discount codes registered for the current user.
 * Used by the booking UI to preview and by the booking backend to auto-apply.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Anmeldung erforderlich' })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })
    }

    const { id: userId, tenant_id: tenantId } = userProfile
    const now = new Date().toISOString()

    const { data: userCodes, error } = await supabase
      .from('user_discount_codes')
      .select(`
        id,
        code,
        registered_at,
        expires_at,
        discount_id,
        discounts (
          id,
          name,
          discount_type,
          discount_value,
          max_discount_rappen,
          valid_until,
          is_active,
          auto_apply,
          usage_limit,
          usage_count
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (error) {
      logger.error('❌ Failed to load user discount codes:', error)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Rabattcodes' })
    }

    // Filter out expired entries and discounts that are no longer valid
    const active = (userCodes || []).filter((udc: any) => {
      const discount = udc.discounts
      if (!discount?.is_active) return false

      // Check user_discount_codes expiry (overrides discount valid_until)
      const expiresAt = udc.expires_at ? new Date(udc.expires_at) : null
      if (expiresAt && expiresAt < new Date()) return false

      // Check discount's own valid_until as fallback
      const discountValidUntil = discount.valid_until ? new Date(discount.valid_until) : null
      if (!expiresAt && discountValidUntil && discountValidUntil < new Date()) return false

      // Check global usage limit
      if (discount.usage_limit && (discount.usage_count ?? 0) >= discount.usage_limit) return false

      return true
    })

    logger.debug('✅ Loaded auto-apply discounts for user:', userId, 'count:', active.length)
    return { discounts: active }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ Error in GET /api/discounts/my-auto-discounts:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Rabattcodes' })
  }
})
