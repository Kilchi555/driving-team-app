import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * GET /api/auth/check-password-strength
 * 
 * Check if the current user needs to update their password
 * Returns requiresUpdate flag based on password_strength_version
 * 
 * Security:
 * - ✅ Requires valid session (httpOnly cookie)
 * - ✅ Only returns info for authenticated user
 * - ✅ Logs all checks for audit trail
 */
export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user from cookie
    const authUser = await getAuthenticatedUser(event)
    
    if (!authUser) {
      logger.warn('❌ [PASSWORD-STRENGTH-CHECK] No authenticated user')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    // Get supabase client for database queries
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user's password strength version from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_strength_version, email')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      logger.warn('⚠️ [PASSWORD-STRENGTH-CHECK] User DB record not found', {
        userId: authUser.id,
        email: authUser.email?.substring(0, 3) + '***'
      })
      
      // User authenticated but no DB record - assume old version
      return {
        requiresUpdate: true,
        reason: 'no_db_record',
        message: 'Passwort-Sicherheit muss aktualisiert werden'
      }
    }

    const requiresUpdate = !user.password_strength_version || user.password_strength_version < 2

    logger.debug('✅ [PASSWORD-STRENGTH-CHECK] Checked for user', {
      userId: authUser.id,
      email: user.email?.substring(0, 3) + '***',
      currentVersion: user.password_strength_version,
      requiresUpdate
    })

    return {
      requiresUpdate,
      currentVersion: user.password_strength_version || 1,
      reason: requiresUpdate ? 'password_upgrade_available' : 'password_already_strong',
      message: requiresUpdate 
        ? 'Passwort-Sicherheit muss aktualisiert werden' 
        : 'Ihr Passwort erfüllt bereits die aktuellen Sicherheitsstandards'
    }

  } catch (error: any) {
    logger.error('❌ [PASSWORD-STRENGTH-CHECK] Error:', error.message || error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check password strength'
    })
  }
})
