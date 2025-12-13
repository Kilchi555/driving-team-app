import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Start WebAuthn authentication
 * Returns list of user's passkeys and authentication challenge
 */
export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const rpId = new URL(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { email } = await readBody(event)

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email required'
      })
    }

    logger.debug(`🔐 WebAuthn authenticate-start for email: ${email}`)

    // 1. Find user by email
    const { data: userProfile, error: userError } = await serviceSupabase
      .from('users')
      .select('id, email, mfa_enabled')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !userProfile) {
      logger.warn(`⚠️ User not found for WebAuthn: ${email}`)
      // Don't reveal if user exists for security
      throw createError({
        statusCode: 400,
        statusMessage: 'User not found'
      })
    }

    // 2. Check if MFA is enabled
    if (!userProfile.mfa_enabled) {
      logger.warn(`⚠️ MFA not enabled for user: ${email}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'MFA not enabled for this account'
      })
    }

    // 3. Get user's passkeys
    const { data: credentials, error: credError } = await serviceSupabase
      .from('webauthn_credentials')
      .select('id, credential_id, device_name, last_used_at')
      .eq('user_id', userProfile.id)
      .eq('is_active', true)

    if (credError) {
      logger.error('❌ Error fetching credentials:', credError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch credentials'
      })
    }

    if (!credentials || credentials.length === 0) {
      logger.warn(`⚠️ No active credentials found for user: ${email}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'No passkeys registered'
      })
    }

    logger.debug(`✅ Found ${credentials.length} passkeys for user: ${email}`)

    // 4. Generate challenge
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const challengeBase64 = Buffer.from(challenge).toString('base64')

    // 5. Create authentication session
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes expiry

    const { error: sessionError } = await serviceSupabase
      .from('webauthn_sessions')
      .insert({
        user_id: userProfile.id,
        challenge: Buffer.from(challenge),
        challenge_type: 'authentication',
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      logger.error('❌ Error creating auth session:', sessionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create authentication session'
      })
    }

    // 6. Return authentication options
    return {
      success: true,
      challenge: challengeBase64,
      userId: userProfile.id,
      allowCredentials: credentials.map((cred: any) => ({
        id: Buffer.from(cred.credential_id).toString('base64'),
        type: 'public-key' as const,
        transports: ['internal', 'usb', 'ble', 'nfc'] // All possible transports
      })),
      timeout: 60000,
      userVerification: 'preferred' as const,
      rp: {
        id: rpId
      }
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
