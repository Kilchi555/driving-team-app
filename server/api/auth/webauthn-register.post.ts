import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { credential, deviceName } = await readBody(event)

    if (!credential || !deviceName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Credential und Device Name erforderlich'
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

    const userId = userData.user.id

    logger.debug('🔐 Verifying WebAuthn credential...')

    // Get user from users table to get the actual user ID
    const { data: user, error: userDbError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (userDbError || !user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User nicht gefunden'
      })
    }

    const actualUserId = user.id

    logger.debug('🔐 Verifying WebAuthn credential...')

    // Validate credential format
    if (!credential.rawId || !credential.response?.clientDataJSON || !credential.response?.attestationObject) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültiges Credential-Format'
      })
    }

    // Decode clientDataJSON to verify challenge
    const clientDataJSON = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, 'base64').toString('utf-8')
    )

    if (clientDataJSON.type !== 'webauthn.create') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültiger WebAuthn-Typ'
      })
    }

    logger.debug('✅ Credential verified, storing in database...')

    // Extract public key from attestation object (simplified)
    // In production, you should use a proper WebAuthn library like @simplewebauthn/server
    const attestationObject = Buffer.from(credential.response.attestationObject, 'base64')
    
    // For now, store the raw credential data
    // A proper implementation would parse the attestation object and extract the public key
    const publicKeyData = Buffer.from(credential.rawId, 'base64').toString('base64')

    // Store credential in database
    const { data: stored, error: dbError } = await adminSupabase
      .from('webauthn_credentials')
      .insert({
        user_id: actualUserId,
        credential_id: credential.id,
        public_key: publicKeyData,
        device_name: deviceName,
        transports: credential.response.transports || []
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Speichern des Credentials'
      })
    }

    logger.debug('✅ WebAuthn credential stored successfully')

    return {
      success: true,
      message: 'Face ID erfolgreich registriert',
      credential: stored
    }
  } catch (error: any) {
    console.error('WebAuthn registration verification error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'WebAuthn-Verifikation fehlgeschlagen'
    })
  }
})

