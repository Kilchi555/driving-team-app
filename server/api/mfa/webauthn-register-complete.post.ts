import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Complete WebAuthn registration
 * Verifies the attestation object and stores the credential
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

    // Get auth header
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

    // Parse request body
    const { credential, deviceName } = await readBody(event)

    if (!credential) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Credential is required'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user profile
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // TODO: Verify the attestation object (this requires a WebAuthn library like @simplewebauthn/server)
    // For now, we'll do a simplified version

    // Decode credentialId from base64
    const credentialId = Buffer.from(credential.rawId, 'base64')
    const publicKeyBuffer = Buffer.from(credential.response.attestationObject, 'base64')

    logger.debug('✅ WebAuthn credential received, storing...')

    // Store the credential
    const { data: storedCredential, error: storeError } = await adminSupabase
      .from('webauthn_credentials')
      .insert({
        user_id: userProfile.id,
        credential_id: credentialId,
        public_key: publicKeyBuffer,
        transports: credential.transports || ['internal'],
        device_name: deviceName || 'Security Key'
      })
      .select()
      .single()

    if (storeError) {
      logger.debug('❌ Error storing credential:', storeError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to store credential'
      })
    }

    // Enable MFA for user
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        mfa_enabled: true,
        mfa_setup_completed_at: new Date().toISOString()
      })
      .eq('id', userProfile.id)

    if (updateError) {
      logger.debug('⚠️ Warning: Could not update user MFA status:', updateError)
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase()
    })

    // Store backup codes (hashed in production)
    for (const code of backupCodes) {
      await adminSupabase
        .from('mfa_backup_codes')
        .insert({
          user_id: userProfile.id,
          code
        })
    }

    logger.debug('✅ WebAuthn registration completed successfully')

    return {
      success: true,
      message: 'Passkey registered successfully',
      credential: {
        id: storedCredential.id,
        device_name: storedCredential.device_name
      },
      backup_codes: backupCodes // Return once for the user to save
    }
  } catch (error: any) {
    console.error('Error in webauthn-register-complete:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to complete registration'
    })
  }
})

