import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * POST /api/discounts/register-for-user
 *
 * Registers an auto_apply discount code for the current user.
 * Once registered, the code is applied automatically to every future booking
 * (online and staff-created), without the user needing to enter it again.
 *
 * Only discounts with auto_apply = true can be registered this way.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { code } = body

    if (!code || typeof code !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Code ist erforderlich' })
    }

    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Anmeldung erforderlich' })
    }

    const supabase = getSupabaseAdmin()

    // Load internal user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })
    }

    const { id: userId, tenant_id: tenantId } = userProfile

    // Find the discount – must be auto_apply and active
    const { data: discount, error: discountError } = await supabase
      .from('discounts')
      .select('id, name, code, discount_type, discount_value, valid_from, valid_until, is_active, auto_apply, first_lesson_only, usage_limit, usage_count')
      .ilike('code', code.trim())
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('auto_apply', true)
      .maybeSingle()

    if (discountError || !discount) {
      return {
        success: false,
        error: 'Code nicht gefunden oder nicht für automatische Anwendung freigegeben'
      }
    }

    // A first_lesson_only discount must never be auto-applied to all bookings
    if (discount.first_lesson_only) {
      return {
        success: false,
        error: 'Dieser Code gilt nur für die erste Fahrstunde und kann nicht als Dauerrabatt registriert werden'
      }
    }

    // Validate date range
    const now = new Date()
    const validFrom = discount.valid_from ? new Date(discount.valid_from) : null
    const validUntil = discount.valid_until ? new Date(discount.valid_until) : null

    if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
      return { success: false, error: 'Dieser Code ist abgelaufen oder noch nicht gültig' }
    }

    // Validate global usage limit
    if (discount.usage_limit && (discount.usage_count ?? 0) >= discount.usage_limit) {
      return { success: false, error: 'Dieser Code hat sein Nutzungslimit erreicht' }
    }

    // Check if user already registered this code
    const { data: existing } = await supabase
      .from('user_discount_codes')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .ilike('code', code.trim())
      .maybeSingle()

    if (existing) {
      if (existing.is_active) {
        return { success: false, error: 'Du hast diesen Code bereits registriert' }
      }
      // Reactivate if previously deactivated
      await supabase
        .from('user_discount_codes')
        .update({ is_active: true, expires_at: validUntil })
        .eq('id', existing.id)

      logger.debug('✅ Reactivated user discount code:', code, 'for user:', userId)
      return { success: true, discount: { name: discount.name, discount_type: discount.discount_type, discount_value: discount.discount_value, valid_until: discount.valid_until } }
    }

    // Register the code
    const { error: insertError } = await supabase
      .from('user_discount_codes')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        code: code.trim().toUpperCase(),
        discount_id: discount.id,
        expires_at: validUntil
      })

    if (insertError) {
      logger.error('❌ Failed to register user discount code:', insertError)
      throw createError({ statusCode: 500, statusMessage: 'Code konnte nicht gespeichert werden' })
    }

    logger.debug('✅ Registered auto-apply discount code:', code, 'for user:', userId)
    return {
      success: true,
      discount: {
        name: discount.name,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        valid_until: discount.valid_until
      }
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ Error in POST /api/discounts/register-for-user:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Registrieren des Codes' })
  }
})
