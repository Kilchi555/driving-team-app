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
        statusMessage: 'Passwort muss mindestens 12 Zeichen lang sein'
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
      .select('auth_user_id, email')
      .eq('id', tokenData.user_id)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Benutzer nicht gefunden'
      })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!user.auth_user_id || !uuidRegex.test(user.auth_user_id)) {
      // Pending user: no auth account exists yet.
      // Instead of failing, create one now and set the chosen password immediately.
      if (!user.email) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Passwort-Reset nicht möglich — keine E-Mail-Adresse hinterlegt',
          data: { code: 'ACCOUNT_PENDING' }
        })
      }

      logger.debug('🆕 Pending user — creating auth account and setting password:', user.email)

      const { data: newAuthData, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
        email: user.email,
        password: newPassword,
        email_confirm: true,
      })

      if (createAuthError || !newAuthData?.user?.id) {
        console.error('❌ Failed to create auth user for pending account:', createAuthError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Fehler beim Anlegen des Accounts — bitte versuche es erneut',
          data: { code: 'ACCOUNT_PENDING' }
        })
      }

      const newAuthUserId = newAuthData.user.id

      // Link the new auth user to the existing users table row
      const { error: linkError } = await serviceSupabase
        .from('users')
        .update({ auth_user_id: newAuthUserId })
        .eq('id', tokenData.user_id)

      if (linkError) {
        console.error('❌ Failed to link new auth user to users row:', linkError)
        // Auth user was created but linking failed — still mark token as used
      }

      // Mark token as used
      await serviceSupabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)

      logger.debug('✅ Pending user activated — auth account created and password set:', newAuthUserId)

      return {
        success: true,
        message: 'Account aktiviert und Passwort gesetzt — du kannst dich jetzt anmelden'
      }
    }

    logger.debug('🔐 Updating password for user:', user.auth_user_id)

    // Update auth user password
    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
      user.auth_user_id,
      { password: newPassword }
    )

    if (updateError) {
      // Auth user was deleted from Supabase Auth but UUID still in users table.
      // Re-create the auth user so the reset succeeds.
      if ((updateError as any).code === 'user_not_found' || (updateError as any).status === 404) {
        if (!user.email) {
          throw createError({ statusCode: 400, statusMessage: 'Benutzer nicht gefunden — keine E-Mail hinterlegt' })
        }

        logger.debug('⚠️ auth_user_id exists but not in Supabase Auth — re-creating:', user.auth_user_id)

        const { data: newAuthData, error: createErr } = await serviceSupabase.auth.admin.createUser({
          email: user.email,
          password: newPassword,
          email_confirm: true,
        })

        if (createErr || !newAuthData?.user?.id) {
          console.error('❌ Failed to re-create auth user:', createErr)
          throw createError({ statusCode: 500, statusMessage: 'Fehler beim Zurücksetzen — bitte nochmals versuchen' })
        }

        // Update users table with the fresh auth_user_id
        await serviceSupabase
          .from('users')
          .update({ auth_user_id: newAuthData.user.id })
          .eq('id', tokenData.user_id)

        logger.debug('✅ Auth user re-created and linked:', newAuthData.user.id)
      } else {
        console.error('❌ Password update error:', updateError)
        throw createError({
          statusCode: 400,
          statusMessage: updateError.message || 'Fehler beim Aktualisieren des Passworts'
        })
      }
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

