import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    logger.debug('🔐 WebAuthn assertion options requested')

    // Generate assertion options (for authentication)
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')

    const options = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: process.env.WEBAUTHN_RP_ID || 'localhost'
      // Note: allowCredentials should be populated dynamically if we know the user
      // For now, we let the browser use any registered credential
    }

    logger.debug('✅ Generated WebAuthn assertion options')

    return {
      options
    }
  } catch (error: any) {
    console.error('WebAuthn assertion options error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Generieren der Authentifizierungsoptionen'
    })
  }
})

