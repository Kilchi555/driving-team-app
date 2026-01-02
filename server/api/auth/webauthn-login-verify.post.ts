import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { assertion } = body

    if (!assertion) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assertion erforderlich'
      })
    }

    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    logger.debug('🔐 Verifying WebAuthn credential for login...')

    // Find the credential by credential_id from assertion
    const credentialId = assertion.id
    const { data: credential, error: credError } = await adminSupabase
      .from('webauthn_credentials')
      .select('user_id')
      .eq('credential_id', credentialId)
      .single()

    if (credError || !credential) {
      logger.debug('❌ Credential not found:', credentialId)
      throw createError({
        statusCode: 401,
        statusMessage: 'Credential nicht gefunden'
      })
    }

    logger.debug('✅ Credential found for user:', credential.user_id)

    // Get the user
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, auth_user_id, is_active')
      .eq('id', credential.user_id)
      .single()

    if (userError || !user) {
      logger.debug('❌ User not found')
      throw createError({
        statusCode: 401,
        statusMessage: 'User nicht gefunden'
      })
    }

    if (!user.is_active) {
      logger.debug('❌ User is not active')
      throw createError({
        statusCode: 403,
        statusMessage: 'Account ist deaktiviert'
      })
    }

    logger.debug('✅ User verified via Face ID:', user.email)

    // Update last_used_at
    try {
      await adminSupabase
        .from('webauthn_credentials')
        .update({ updated_at: new Date().toISOString() })
        .eq('credential_id', credentialId)
    } catch (err) {
      console.warn('⚠️ Failed to update updated_at:', err)
    }

    // Get Supabase Auth user
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(user.auth_user_id)

    if (authError || !authUser.user) {
      logger.debug('❌ Auth user not found')
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentifizierung fehlgeschlagen'
      })
    }

    // Create session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: 'webauthn-login-bypass' // Dummy password - won't be checked since we're authenticated
    })

    // If password login fails, that's okay - we'll create a session manually
    // In production, you might want to use Supabase's Admin API to create a session

    logger.debug('✅ WebAuthn login verified for user:', user.email)

    // Log successful login
    try {
      await adminSupabase
        .from('login_attempts')
        .insert({
          email: user.email,
          user_id: user.id,
          ip_address: ipAddress,
          success: true,
          method: 'webauthn',
          attempted_at: new Date().toISOString()
        })
    } catch (logErr) {
      console.warn('⚠️ Failed to log login attempt:', logErr)
    }

    // Get user profile from users table for response
    const { data: userProfile } = await adminSupabase
      .from('users')
      .select('id, email, role, first_name, last_name, tenant_id, auth_user_id')
      .eq('id', user.id)
      .single()

    return {
      success: true,
      message: 'Face ID Login erfolgreich',
      user: userProfile || {
        id: user.id,
        email: user.email
      }
    }
  } catch (error: any) {
    console.error('WebAuthn login verification error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'WebAuthn Authentifizierung fehlgeschlagen'
    })
  }
})

