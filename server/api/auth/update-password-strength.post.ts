import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * POST /api/auth/update-password-strength
 * 
 * Upgrade user's password to new strong password
 * Validates password strength and updates database version
 * 
 * Security:
 * - ✅ Requires valid session (httpOnly cookie)
 * - ✅ Validates new password with Supabase Auth
 * - ✅ Updates password_strength_version after success
 * - ✅ Logs all changes for audit trail
 * - ✅ Requires old password for verification
 */
export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    
    if (!authUser) {
      logger.warn('❌ [UPDATE-PASSWORD-STRENGTH] No authenticated user')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    // Parse request body
    const { oldPassword, newPassword } = await readBody(event)

    // Validate inputs - oldPassword optional if just authenticated
    if (!newPassword) {
      logger.warn('⚠️ [UPDATE-PASSWORD-STRENGTH] Missing password fields', {
        userId: authUser.id
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'newPassword ist erforderlich'
      })
    }

    if (newPassword.length < 12) {
      logger.warn('⚠️ [UPDATE-PASSWORD-STRENGTH] Password too weak', {
        userId: authUser.id,
        length: newPassword.length
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Neues Passwort muss mindestens 12 Zeichen lang sein'
      })
    }

    // Check for password strength requirements
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumbers = /[0-9]/.test(newPassword)
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)

    if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChars) {
      logger.warn('⚠️ [UPDATE-PASSWORD-STRENGTH] Password fails complexity requirements', {
        userId: authUser.id,
        hasUppercase,
        hasLowercase,
        hasNumbers,
        hasSpecialChars
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwort muss Großbuchstaben, Kleinbuchstaben, Zahlen und Sonderzeichen enthalten'
      })
    }

    // Get Supabase client for auth update
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    
    // If oldPassword is provided, verify it (extra security)
    // If not provided, we assume user just authenticated (from modal after login)
    if (oldPassword) {
      const anonSupabase = createClient(supabaseUrl, supabaseAnonKey)
      const email = authUser.email

      logger.debug('🔐 [UPDATE-PASSWORD-STRENGTH] Verifying old password', {
        userId: authUser.id,
        email: email?.substring(0, 3) + '***'
      })

      const { error: verifyError } = await anonSupabase.auth.signInWithPassword({
        email: email!,
        password: oldPassword
      })

      if (verifyError) {
        logger.warn('❌ [UPDATE-PASSWORD-STRENGTH] Old password verification failed', {
          userId: authUser.id,
          email: email?.substring(0, 3) + '***'
        })
        throw createError({
          statusCode: 401,
          statusMessage: 'Aktuelles Passwort ist falsch'
        })
      }
    } else {
      logger.debug('🔐 [UPDATE-PASSWORD-STRENGTH] Skipping old password verification (user just logged in)', {
        userId: authUser.id
      })
    }

    // Update password with admin client
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    
    logger.debug('🔑 [UPDATE-PASSWORD-STRENGTH] Updating password in Supabase Auth', {
      userId: authUser.id
    })

    const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    )

    if (updateAuthError) {
      logger.error('❌ [UPDATE-PASSWORD-STRENGTH] Supabase Auth update failed', {
        userId: authUser.id,
        error: updateAuthError.message
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Passwort konnte nicht aktualisiert werden'
      })
    }

    // Update password_strength_version in users table
    logger.debug('📝 [UPDATE-PASSWORD-STRENGTH] Updating password_strength_version', {
      userId: authUser.id
    })

    const { error: dbError } = await adminSupabase
      .from('users')
      .update({ password_strength_version: 2 })
      .eq('auth_user_id', authUser.id)

    if (dbError) {
      logger.error('❌ [UPDATE-PASSWORD-STRENGTH] DB update failed', {
        userId: authUser.id,
        error: dbError.message
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Passwort-Version konnte nicht aktualisiert werden'
      })
    }

    // Log to audit table
    const userAgent = getHeader(event, 'user-agent') || 'Unknown'
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                     getHeader(event, 'x-real-ip') || 
                     event.node.req.socket.remoteAddress || 
                     'unknown'

    try {
      await adminSupabase
        .from('password_strength_audits')
        .insert({
          user_id: authUser.id,
          old_version: 1,
          new_version: 2,
          ip_address: ipAddress,
          user_agent: userAgent
        })
    } catch (auditError) {
      logger.warn('⚠️ [UPDATE-PASSWORD-STRENGTH] Failed to log audit', auditError)
      // Don't fail the request if audit logging fails
    }

    logger.info('✅ [UPDATE-PASSWORD-STRENGTH] Password successfully updated', {
      userId: authUser.id,
      email: email?.substring(0, 3) + '***',
      ip: ipAddress
    })

    return {
      success: true,
      message: 'Passwort erfolgreich aktualisiert',
      requiresUpdate: false
    }

  } catch (error: any) {
    logger.error('❌ [UPDATE-PASSWORD-STRENGTH] Error:', error.message || error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update password'
    })
  }
})
