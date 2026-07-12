import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { token } = body

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token erforderlich'
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

    logger.debug('🔍 Validating password reset token...')

    // Check if token exists and hasn't expired
    const { data: tokenData, error: tokenError } = await serviceSupabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single()

    // Look up the email early so the frontend can render a hidden username
    // hint for password managers (best-effort — not required for validity).
    const getEmailHint = async (userId: string | undefined) => {
      if (!userId) return null
      const { data: user } = await serviceSupabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()
      return user?.email || null
    }

    if (tokenError || !tokenData) {
      logger.debug('❌ Token not found or error:', tokenError)
      return {
        valid: false,
        message: 'Reset-Token ungültig oder nicht gefunden.'
      }
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      logger.debug('⏰ Token expired at:', expiresAt)
      return {
        valid: false,
        message: 'Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen Link an.'
      }
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      logger.debug('⚠️ Token already used at:', tokenData.used_at)
      return {
        valid: false,
        message: 'Dieser Reset-Link wurde bereits verwendet.'
      }
    }

    logger.debug('✅ Token is valid and not expired')
    return {
      valid: true,
      message: 'Token ist gültig',
      email: await getEmailHint(tokenData.user_id)
    }

  } catch (error: any) {
    console.error('❌ Token validation error:', error)
    throw error
  }
})

