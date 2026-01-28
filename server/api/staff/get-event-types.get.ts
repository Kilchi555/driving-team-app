import { defineEventHandler } from 'h3'
import { getSupabaseServiceClient } from '~/utils/supabase-service'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    const supabase = getSupabaseServiceClient()

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

// Helper function to get authenticated user
async function getAuthenticatedUser(event: any) {
  try {
    const supabase = getSupabaseServiceClient()
    const authHeader = event.node.req.headers.authorization
    
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return user
  } catch {
    return null
  }
}
