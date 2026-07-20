import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    const supabase = getSupabaseAdmin()

    // Load active event types
    const { data, error } = await supabase
      .from('event_types')
      .select('code, default_color, name')
      .eq('is_active', true)
      .order('code')

    if (error) {
      logger.error('❌ Error loading event types:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load event types'
      })
    }

    logger.debug('✅ Event types loaded:', data?.length || 0)
    return {
      success: true,
      data: data || []
    }

  } catch (error: any) {
    logger.error('❌ Error in get-event-types API:', error.message)
    throw error
  }
})
