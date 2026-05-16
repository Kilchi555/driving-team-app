import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * GET /api/staff/get-user-auto-discounts?user_id=<uuid>
 *
 * Returns active auto-apply discount codes registered for a specific student.
 * Used by staff when creating/editing an appointment to preview and auto-apply.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Anmeldung erforderlich' })
    }

    const supabase = getSupabaseAdmin()

    // Verify caller is staff/admin
    const { data: callerProfile, error: callerError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (callerError || !callerProfile) {
      throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })
    }
    if (!['staff', 'admin'].includes(callerProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung' })
    }

    const { user_id } = getQuery(event)
    if (!user_id) {
      throw createError({ statusCode: 400, statusMessage: 'user_id ist erforderlich' })
    }

    const { data: userCodes, error } = await supabase
      .from('user_discount_codes')
      .select(`
        id,
        code,
        registered_at,
        expires_at,
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
      .eq('user_id', user_id)
      .eq('tenant_id', callerProfile.tenant_id)
      .eq('is_active', true)

    if (error) {
      logger.error('❌ Failed to load user auto-discounts:', error)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Rabattcodes' })
    }

    // Filter to only active, valid entries
    const active = (userCodes || []).filter((udc: any) => {
      const d = udc.discounts
      if (!d?.is_active || !d?.auto_apply) return false
      const expiresAt = udc.expires_at ? new Date(udc.expires_at) : null
      if (expiresAt && expiresAt < new Date()) return false
      const discountValidUntil = d.valid_until ? new Date(d.valid_until) : null
      if (!expiresAt && discountValidUntil && discountValidUntil < new Date()) return false
      if (d.usage_limit && (d.usage_count ?? 0) >= d.usage_limit) return false
      return true
    })

    logger.debug('✅ Loaded auto-discounts for student:', user_id, 'count:', active.length)
    return { discounts: active }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ Error in GET /api/staff/get-user-auto-discounts:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Rabattcodes' })
  }
})
