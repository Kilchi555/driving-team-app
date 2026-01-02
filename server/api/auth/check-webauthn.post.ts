import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { email } = await readBody(event)

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email erforderlich'
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

    logger.debug('🔐 Checking WebAuthn availability for:', email)

    // Get user by email
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, auth_user_id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      logger.debug('❌ User not found:', email)
      return {
        hasWebAuthn: false,
        message: 'User nicht gefunden'
      }
    }

    // Check if user has WebAuthn credentials
    const { data: credentials, error: credError } = await adminSupabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (credError) {
      logger.debug('⚠️ Error checking credentials:', credError)
      return {
        hasWebAuthn: false
      }
    }

    const hasWebAuthn = credentials && credentials.length > 0

    logger.debug(`✅ WebAuthn check for ${email}:`, hasWebAuthn)

    return {
      success: true,
      hasWebAuthn,
      message: hasWebAuthn ? 'User hat WebAuthn registriert' : 'User hat kein WebAuthn'
    }
  } catch (error: any) {
    console.error('WebAuthn check error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Prüfen von WebAuthn'
    })
  }
})

