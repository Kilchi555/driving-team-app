import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { token, newPassword } = body

    if (!token || !newPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token und neues Passwort erforderlich'
      })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwort muss mindestens 8 Zeichen lang sein'
      })
    }

    // Create service role client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    logger.debug('🔐 Processing password reset...')

    // Get reset token data
    const { data: tokenData, error: tokenError } = await serviceSupabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      logger.debug('❌ Token not found')
      throw createError({
        statusCode: 400,
        statusMessage: 'Reset-Token ungültig'
      })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      logger.debug('⏰ Token expired')
      throw createError({
        statusCode: 400,
        statusMessage: 'Reset-Token ist abgelaufen'
      })
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      logger.debug('⚠️ Token already used')
      throw createError({
        statusCode: 400,
        statusMessage: 'Dieser Reset-Link wurde bereits verwendet'
      })
    }

    // Get the auth user id from the reset token user
    const { data: user, error: userError } = await serviceSupabase
      .from('users')
      .select('auth_user_id')
      .eq('id', tokenData.user_id)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Benutzer nicht gefunden'
      })
    }

    logger.debug('🔐 Updating password for user:', user.auth_user_id)

    // Update auth user password
    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
      user.auth_user_id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ Password update error:', updateError)
      throw createError({
        statusCode: 400,
        statusMessage: updateError.message || 'Fehler beim Aktualisieren des Passworts'
      })
    }

    logger.debug('✅ Password updated successfully')

    // Mark token as used
    const { error: markUsedError } = await serviceSupabase
      .from('password_reset_tokens')
      .update({
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (markUsedError) {
      console.warn('⚠️ Failed to mark token as used:', markUsedError)
      // Don't fail the whole process - password is already updated
    }

    logger.debug('✅ Password reset completed successfully')

    return {
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt'
    }

  } catch (error: any) {
    console.error('❌ Password reset error:', error)
    throw error
  }
})

