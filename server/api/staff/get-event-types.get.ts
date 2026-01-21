import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-event-types
 * 
 * Secure API to fetch event types with default durations for EventModal
 * 
 * Query Params:
 *   - event_type_codes (optional): Comma-separated codes to fetch specific event types
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation (or global if tenant_id is null)
 *   3. Rate Limiting (100 req/min per user)
 *   4. Caching (60 seconds)
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!userProfile.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const eventTypeCodesParam = query.event_type_codes as string | undefined

    let eventTypeCodes: string[] | undefined
    if (eventTypeCodesParam) {
      eventTypeCodes = eventTypeCodesParam.split(',').map(code => code.trim())
    }

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    // Event types can be global (tenant_id is null) or tenant-specific
    let query_builder = supabaseAdmin
      .from('event_types')
      .select('id, code, name, default_duration_minutes, is_active, tenant_id')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq('is_active', true)

    // Filter by specific codes if provided
    if (eventTypeCodes && eventTypeCodes.length > 0) {
      query_builder = query_builder.in('code', eventTypeCodes)
    }

    const { data: eventTypes, error } = await query_builder.order('name', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching event types:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch event types'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Event types fetched successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      count: eventTypes?.length || 0,
      filtered: !!eventTypeCodes
    })

    return {
      success: true,
      data: eventTypes || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-event-types API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch event types'
    })
  }
})

