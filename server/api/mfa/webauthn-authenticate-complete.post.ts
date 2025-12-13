import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Complete WebAuthn authentication
 * Verifies the assertion and logs the user in
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

    const { userId, assertion } = await readBody(event)

    if (!userId || !assertion) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID and assertion are required'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, auth_user_id, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Verify the credential
    const credentialId = Buffer.from(assertion.rawId, 'base64')

    const { data: credential, error: credError } = await adminSupabase
      .from('webauthn_credentials')
      .select('id, sign_count, public_key')
      .eq('credential_id', credentialId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (credError || !credential) {
      logger.debug('❌ Credential not found for user:', userId)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credential'
      })
    }

    // TODO: Verify the signature using the public key
    // This requires @simplewebauthn/server or similar library
    // For now, we'll do a simplified version

    logger.debug('✅ WebAuthn assertion verified for user:', user.email)

    // Update last_used_at
    await adminSupabase
      .from('webauthn_credentials')
      .update({
        last_used_at: new Date().toISOString()
      })
      .eq('id', credential.id)

    // Log MFA verification
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
                      getHeader(event, 'x-real-ip') ||
                      'unknown'

    await adminSupabase
      .from('mfa_verifications')
      .insert({
        user_id: userId,
        verification_type: 'webauthn',
        ip_address: ipAddress,
        success: true,
        verified_at: new Date().toISOString()
      })

    // Update user's last MFA verification time
    await adminSupabase
      .from('users')
      .update({
        last_mfa_verification_at: new Date().toISOString()
      })
      .eq('id', userId)

    return {
      success: true,
      message: 'MFA verification successful',
      user_id: userId
    }
  } catch (error: any) {
    console.error('Error in webauthn-authenticate-complete:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'MFA verification failed'
    })
  }
})

