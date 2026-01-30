// server/api/event-types/list.get.ts
// Retrieve all active event types for the current user's tenant

import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get user context from session - now includes tenant_id automatically
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User has no tenant assigned'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    logger.debug('🔍 Loading event types for tenant:', authUser.tenant_id)

    // Load event types for this tenant
    const { data: eventTypes, error } = await supabaseAdmin
      .from('event_types')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', authUser.tenant_id)
      .order('display_order', { ascending: true })

    if (error) {
      logger.error('❌ Error loading event types:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load event types'
      })
    }

    logger.debug('✅ Event types loaded:', eventTypes?.length || 0)

    return {
      success: true,
      data: eventTypes || [],
      count: (eventTypes || []).length
    }

  } catch (err: any) {
    logger.error('❌ Error in event-types/list:', err)
    
    if (err.statusCode) {
      throw err
    }

    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal server error'
    })
  }
})
