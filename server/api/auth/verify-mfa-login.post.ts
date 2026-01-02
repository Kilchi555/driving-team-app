import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { email, password, code, mfaType } = await readBody(event)

    if (!email || !password || !code || !mfaType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Alle Felder erforderlich'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Verify code first (before attempting password login)
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Ungültige Anmeldedaten'
      })
    }

    // Get the most recent MFA code for this user
    const { data: loginCode, error: codeError } = await adminSupabase
      .from('mfa_login_codes')
      .select('id, code_hash, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeError || !loginCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kein gültiger Code gefunden. Bitte anfordern Sie einen neuen Code.'
      })
    }

    // Check if code is expired
    const expiresAt = new Date(loginCode.expires_at)
    if (expiresAt < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Der Code ist abgelaufen. Bitte anfordern Sie einen neuen Code.'
      })
    }

    // Verify code (in production, use proper hash comparison)
    const codeMatches = await verifyCodeHash(code, loginCode.code_hash)
    if (!codeMatches) {
      // Increment failed attempts
      await adminSupabase
        .from('mfa_failed_attempts')
        .insert({
          user_id: user.id,
          method_type: mfaType,
          created_at: new Date().toISOString()
        })
        .throwOnError()

      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültiger Code. Bitte versuchen Sie es erneut.'
      })
    }

    // Code is valid, now attempt password login
    logger.debug('✅ MFA code verified, attempting password login for:', email.substring(0, 3) + '***')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    })

    if (authError || !authData.user || !authData.session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Ungültige Anmeldedaten'
      })
    }

    // Delete the used code
    try {
      await adminSupabase
        .from('mfa_login_codes')
        .delete()
        .eq('id', loginCode.id)
        .throwOnError()
    } catch (delError) {
      console.warn('⚠️ Failed to delete used MFA code:', delError)
    }

    // Reset failed login attempts
    try {
      await adminSupabase
        .rpc('reset_failed_login_attempts', {
          p_user_id: authData.user.id
        })
        .throwOnError()
    } catch (resetError) {
      console.warn('⚠️ Failed to reset login attempts:', resetError)
    }

    // Log successful MFA login
    try {
      await adminSupabase
        .from('login_attempts')
        .insert({
          email: email.toLowerCase().trim(),
          user_id: authData.user.id,
          success: true,
          attempted_at: new Date().toISOString()
        })
        .throwOnError()
    } catch (logError) {
      console.warn('⚠️ Failed to log MFA login:', logError)
    }

    logger.debug('✅ MFA login successful for user:', authData.user.id)

    return {
      success: true,
      message: 'Anmeldung erfolgreich',
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        expires_at: authData.session.expires_at
      },
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: authData.user.user_metadata
      }
    }
  } catch (error: any) {
    console.error('MFA login error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'MFA-Verifikation fehlgeschlagen'
    })
  }
})

async function verifyCodeHash(code: string, codeHash: string): Promise<boolean> {
  try {
    // Simple verification - in production, use proper bcrypt or scrypt
    const encoder = new TextEncoder()
    const data = encoder.encode(code)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return computedHash === codeHash
  } catch (error) {
    console.warn('⚠️ Code hash verification error:', error)
    return false
  }
}



