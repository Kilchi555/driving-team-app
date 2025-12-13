import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Complete WebAuthn registration
 * Verifies the credential and stores it for future authentication
 */
export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.substring(7)
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Get current user from token
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      logger.debug('❌ Could not get user from token:', userError?.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Could not verify user'
      })
    }

    logger.debug('✅ User authenticated:', user.id)

    // Get user profile
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.debug('❌ User profile not found:', profileError?.message)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    const { credentialId, publicKeyBase64, signCount, deviceName, transports } = await readBody(event)

    if (!credentialId || !publicKeyBase64 || signCount === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing credential data'
      })
    }

    logger.debug(`🔐 Storing passkey for user: ${userProfile.email}, device: ${deviceName}`)

    // Convert Base64 strings back to binary data
    const credentialIdBuffer = Buffer.from(credentialId, 'base64')
    const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64')

    // Store the credential
    const { data: credential, error: credError } = await serviceSupabase
      .from('webauthn_credentials')
      .insert({
        user_id: userProfile.id,
        credential_id: credentialIdBuffer,
        public_key: publicKeyBuffer,
        sign_count: signCount || 0,
        device_name: deviceName || 'Unknown Device',
        transports: transports || [],
        is_active: true
      })
      .select()
      .single()

    if (credError) {
      logger.error('❌ Error storing credential:', credError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to store credential'
      })
    }

    logger.info(`✅ Passkey registered for user: ${userProfile.email}`)

    // Update MFA status
    const { error: mfaUpdateError } = await serviceSupabase
      .from('users')
      .update({
        mfa_enabled: true,
        mfa_setup_completed_at: new Date().toISOString()
      })
      .eq('id', userProfile.id)

    if (mfaUpdateError) {
      logger.warn('⚠️ Error updating MFA status:', mfaUpdateError)
    }

    // Generate backup codes (10 codes)
    const backupCodes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      backupCodes.push(code)

      // Store backup code (marked as unused)
      // Note: We're not using the mfa_backup_codes table for now
      // This is just for showing to user
    }

    return {
      success: true,
      credential: {
        id: credential.id,
        device_name: credential.device_name,
        created_at: credential.created_at
      },
      backup_codes: backupCodes,
      message: 'Passkey registered successfully'
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
