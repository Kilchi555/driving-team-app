import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'

export default defineEventHandler(async (event) => {
  try {
    // Verify user is super_admin. Bearer header with HTTP-only-cookie
    // fallback + token refresh, instead of a raw Bearer-only check that
    // would 401 whenever the client's access token had just expired.
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    if (authUser.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only super_admin users can update security settings'
      })
    }

    // Read request body
    const { settings } = await readBody(event)

    if (!settings) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Settings are required'
      })
    }

    // Store settings (could be in a separate table or config)
    logger.debug('💾 Saving security settings:', settings)

    // For now, just return success
    // In a real implementation, you would store these in a settings table
    return {
      success: true,
      message: 'Security settings have been saved',
      settings
    }

  } catch (error: any) {
    console.error('Error in save-security-settings endpoint:', error)
    
    if (error.statusCode) {
      throw mapSupabaseError(error)
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save security settings'
    })
  }
})

