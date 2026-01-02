import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

// Simple base64 encoding for challenge
function generateChallenge(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

export default defineEventHandler(async (event) => {
  try {
    const { deviceName } = await readBody(event)

    if (!deviceName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Device name erforderlich'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get authenticated user
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Nicht authentifiziert'
      })
    }

    const token = authHeader.split(' ')[1]
    const { data: userData, error: userError } = await adminSupabase.auth.getUser(token)

    if (userError || !userData.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentifizierung erforderlich'
      })
    }

    const authUserId = userData.user.id
    const userEmail = userData.user.email

    logger.debug('🔐 WebAuthn registration options requested for:', userEmail)

    // Get user from users table to get the actual user ID
    const { data: user, error: dbError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('auth_user_id', authUserId)
      .single()

    if (dbError || !user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User nicht gefunden'
      })
    }

    const userId = user.id

    // Generate registration options
    const challenge = generateChallenge()
    const userIdBase64 = Buffer.from(userId).toString('base64')

    const options = {
      challenge,
      rp: {
        name: 'Simy',
        id: process.env.WEBAUTHN_RP_ID || 'localhost'
      },
      user: {
        id: userIdBase64,
        name: userEmail,
        displayName: userEmail.split('@')[0]
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      timeout: 60000,
      attestation: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use device's built-in authenticator (Face ID, Touch ID)
        userVerification: 'required',        // Require biometric
        residentKey: 'preferred'
      }
    }

    logger.debug('✅ Generated WebAuthn registration options')

    return {
      success: true,
      options
    }
  } catch (error: any) {
    console.error('WebAuthn registration options error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Generieren der Registrierungsoptionen'
    })
  }
})

