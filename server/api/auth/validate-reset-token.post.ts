import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

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

    console.log('🔍 Validating password reset token...')

    // Check if token exists and hasn't expired
    const { data: tokenData, error: tokenError } = await serviceSupabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      console.log('❌ Token not found or error:', tokenError)
      return {
        valid: false,
        message: 'Reset-Token ungültig oder nicht gefunden.'
      }
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      console.log('⏰ Token expired at:', expiresAt)
      return {
        valid: false,
        message: 'Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen Link an.'
      }
    }

    // Check if token has already been used
    if (tokenData.used_at) {
      console.log('⚠️ Token already used at:', tokenData.used_at)
      return {
        valid: false,
        message: 'Dieser Reset-Link wurde bereits verwendet.'
      }
    }

    console.log('✅ Token is valid and not expired')
    return {
      valid: true,
      message: 'Token ist gültig'
    }

  } catch (error: any) {
    console.error('❌ Token validation error:', error)
    throw error
  }
})

