import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Start WebAuthn registration challenge
 * This generates a challenge that the client must complete with their passkey
 */
export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    // Get auth header for current user
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Generate random challenge (32 bytes)
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const challengeBase64 = Buffer.from(challenge).toString('base64')

    // Create webauthn session
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes expiry

    const { data: session, error: sessionError } = await adminSupabase
      .from('webauthn_sessions')
      .insert({
        user_id: userProfile.id,
        challenge: Buffer.from(challenge),
        challenge_type: 'registration',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (sessionError) {
      logger.debug('❌ Error creating webauthn session:', sessionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create registration session'
      })
    }

    logger.debug('✅ WebAuthn registration challenge generated for user:', userProfile.email)

    // Return challenge options for the browser
    return {
      challenge: challengeBase64,
      rp: {
        name: 'Driving Team',
        id: new URL(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname
      },
      user: {
        id: userProfile.id,
        name: userProfile.email,
        displayName: `${userProfile.first_name} ${userProfile.last_name}`.trim()
      },
      pubKeyCredParams: [
        { type: 'public-key' as const, alg: -7 }, // ES256
        { type: 'public-key' as const, alg: -257 } // RS256
      ],
      timeout: 60000,
      attestation: 'none' as const,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Limit to platform authenticators (Face ID, fingerprint)
        userVerification: 'preferred'
      }
    }
  } catch (error: any) {
    console.error('Error in webauthn-register-start:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start registration'
    })
  }
})

