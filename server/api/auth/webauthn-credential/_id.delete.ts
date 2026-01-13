import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const credentialId = event.context.params?.id

    if (!credentialId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Credential ID erforderlich'
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

    logger.debug('🗑️ Deleting WebAuthn credential:', credentialId)

    // Verify ownership and delete
    const { error: deleteError } = await adminSupabase
      .from('webauthn_credentials')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', credentialId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('❌ Database error:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Löschen des Credentials'
      })
    }

    logger.debug('✅ WebAuthn credential deleted')

    return {
      success: true,
      message: 'Face ID entfernt'
    }
  } catch (error: any) {
    console.error('Delete WebAuthn credential error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Löschen des WebAuthn-Credentials'
    })
  }
})




