// server/api/locations/list.get.ts
// Secure API for fetching locations
// Security: 10-Layer Protection

import { defineEventHandler, createError, getHeader, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

interface LocationsListResponse {
  success: boolean
  locations?: any[]
  error?: string
}

export default defineEventHandler(async (event): Promise<LocationsListResponse> => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })
    }

    authenticatedUserId = user.id
    logger.debug('🔐 Locations list request from:', user.email)

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'get_locations_list',
      60, // 60 requests per minute
      60000
    )
    if (!rateLimitResult.allowed) {
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'get_locations_list',
        status: 'failed',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress
      })
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    // ============ LAYER 3: GET USER'S TENANT ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authenticatedUserId)
      .eq('is_active', true)
      .single()

    if (userError || !userData) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    tenantId = userData.tenant_id

    // ============ LAYER 4: PARSE QUERY PARAMS ============
    const query = getQuery(event)
    const locationIds = query.ids ? String(query.ids).split(',') : null

    // ============ LAYER 5: FETCH LOCATIONS (TENANT ISOLATED) ============
    let locationsQuery = supabaseAdmin
      .from('locations')
      .select(`
        id,
        name,
        address,
        formatted_address,
        latitude,
        longitude,
        is_active
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    // Filter by specific IDs if provided
    if (locationIds && locationIds.length > 0) {
      locationsQuery = locationsQuery.in('id', locationIds)
    }

    const { data: locations, error: locationsError } = await locationsQuery

    if (locationsError) {
      logger.error('❌ Error fetching locations:', locationsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch locations' })
    }

    // ============ LAYER 6: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      tenant_id: tenantId,
      action: 'get_locations_list',
      resource_type: 'locations',
      status: 'success',
      ip_address: ipAddress,
      details: {
        locations_count: locations?.length || 0,
        filtered_by_ids: !!locationIds,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Locations loaded:', locations?.length || 0)

    return {
      success: true,
      locations: locations || []
    }

  } catch (error: any) {
    logger.error('❌ Locations list API error:', error)
    
    await logAudit({
      auth_user_id: authenticatedUserId,
      tenant_id: tenantId,
      action: 'get_locations_list',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch locations'
    })
  }
})

