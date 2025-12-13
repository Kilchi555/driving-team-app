import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Start WebAuthn authentication challenge
 * This generates a challenge for logging in with a passkey
 */
export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const { email } = await readBody(event)

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email is required'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Find user by email
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, mfa_enabled')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      // Don't reveal if user exists (security)
      logger.debug('⚠️ User not found for MFA auth:', email)
      throw createError({
        statusCode: 401,
        statusMessage: 'Email or password incorrect'
      })
    }

    if (!user.mfa_enabled) {
      // User has not set up MFA yet
      logger.debug('ℹ️ User has not enabled MFA:', email)
      return {
        success: false,
        mfa_required: false,
        message: 'MFA is not enabled for this user'
      }
    }

    // Check if user has any credentials
    const { data: credentials, error: credError } = await adminSupabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (credError || !credentials || credentials.length === 0) {
      logger.debug('⚠️ No active credentials found for user:', email)
      throw createError({
        statusCode: 500,
        statusMessage: 'No credentials found. Please set up a passkey first.'
      })
    }

    // Generate challenge
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const challengeBase64 = Buffer.from(challenge).toString('base64')

    // Create webauthn session
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    const { data: session, error: sessionError } = await adminSupabase
      .from('webauthn_sessions')
      .insert({
        user_id: user.id,
        challenge: Buffer.from(challenge),
        challenge_type: 'authentication',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (sessionError) {
      logger.debug('❌ Error creating webauthn session:', sessionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create authentication session'
      })
    }

    logger.debug('✅ WebAuthn auth challenge generated for user:', email)

    return {
      success: true,
      challenge: challengeBase64,
      rpId: new URL(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname,
      timeout: 60000,
      userVerification: 'preferred'
    }
  } catch (error: any) {
    console.error('Error in webauthn-authenticate-start:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start authentication'
    })
  }
})

