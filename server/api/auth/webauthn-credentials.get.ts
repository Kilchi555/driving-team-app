import { defineEventHandler, createError } from 'h3'
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

    logger.debug('🔍 Fetching WebAuthn credentials for user:', userId.substring(0, 8) + '...')

    // Get user's credentials
    const { data: credentials, error: dbError } = await adminSupabase
      .from('webauthn_credentials')
      .select('id, device_name, created_at, last_used_at, transports')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Abrufen der Credentials'
      })
    }

    logger.debug('✅ Found WebAuthn credentials:', (credentials || []).length)

    return {
      success: true,
      credentials: credentials || []
    }
  } catch (error: any) {
    console.error('Get WebAuthn credentials error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Abrufen der WebAuthn-Credentials'
    })
  }
})



