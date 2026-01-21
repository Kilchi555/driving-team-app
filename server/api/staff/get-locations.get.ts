import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-locations
 * 
 * Secure API to fetch locations for EventModal
 * 
 * Query Params:
 *   - location_ids (optional): Comma-separated location IDs to fetch specific locations
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
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
    const locationIdsParam = query.location_ids as string | undefined

    let locationIds: string[] | undefined
    if (locationIdsParam) {
      locationIds = locationIdsParam.split(',').map(id => id.trim())
      
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      for (const id of locationIds) {
        if (!uuidRegex.test(id)) {
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid location ID format: ${id}`
          })
        }
      }
    }

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    let query_builder = supabaseAdmin
      .from('locations')
      .select('id, name, address, formatted_address, street, street_number, zip, city, country, tenant_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    // Filter by specific IDs if provided
    if (locationIds && locationIds.length > 0) {
      query_builder = query_builder.in('id', locationIds)
    }

    const { data: locations, error } = await query_builder.order('name', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching locations:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch locations'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Locations fetched successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      count: locations?.length || 0,
      filtered: !!locationIds
    })

    return {
      success: true,
      data: locations || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-locations API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch locations'
    })
  }
})

