import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * POST /api/discounts/deactivate-user-code
 * Deactivates a registered auto-apply discount code for the current user.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id } = body

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID ist erforderlich' })
    }

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

    // Only allow deactivating own codes
    const { error } = await supabase
      .from('user_discount_codes')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userProfile.id)
      .eq('tenant_id', userProfile.tenant_id)

    if (error) {
      logger.error('❌ Failed to deactivate user discount code:', error)
      throw createError({ statusCode: 500, statusMessage: 'Code konnte nicht deaktiviert werden' })
    }

    logger.debug('✅ Deactivated user discount code:', id)
    return { success: true }
  } catch (err: any) {
    if (err.statusCode) throw err
    logger.error('❌ Error in POST /api/discounts/deactivate-user-code:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Deaktivieren des Codes' })
  }
})
