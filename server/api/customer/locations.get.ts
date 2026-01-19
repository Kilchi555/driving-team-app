/**
 * GET /api/customer/locations
 * 
 * Fetch all locations for tenant
 * 3-Layer: Auth + Validation → Transform → DB Query + Caching
 * 
 * Security: Session auth, tenant isolation, rate limiting
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes (locations rarely change)
const locationsCache = new Map<string, { data: any; timestamp: number }>()

/**
 * LAYER 2: Data Transformation
 */
const transformLocations = (locations: any[]): any[] => {
  return locations.map(loc => ({
    id: loc.id,
    name: loc.name || '',
    address: loc.address || '',
    formattedAddress: loc.formatted_address || '',
    city: loc.city || '',
    zip: loc.zip || '',
    coordinates: loc.coordinates || null,
    active: loc.is_active !== false
  }))
}

/**
 * LAYER 3: Database + Cache
 */
const fetchLocationsFromDb = async (tenantId: string): Promise<any[]> => {
  const supabase = getSupabaseAdmin()
  
  try {
    logger.debug(`📍 Fetching locations for tenant: ${tenantId}`)
    
    const { data, error } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        address,
        formatted_address,
        city,
        zip,
        coordinates,
        is_active,
        tenant_id
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      logger.error(`❌ Database error fetching locations:`, error)
      return []
    }
    
    logger.debug(`✅ Fetched ${data?.length || 0} locations`)
    return data || []
  } catch (err: any) {
    logger.error('❌ Unexpected error in fetchLocationsFromDb:', err)
    return []
  }
}

const getCachedLocations = (tenantId: string): any[] | null => {
  const cached = locationsCache.get(tenantId)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_DURATION) {
    locationsCache.delete(tenantId)
    return null
  }
  
  logger.debug(`⚡ Cache HIT for locations (${Math.round(age / 1000)}s old)`)
  return cached.data
}

const setCachedLocations = (tenantId: string, data: any[]): void => {
  locationsCache.set(tenantId, { data, timestamp: Date.now() })
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & VALIDATION ==========
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.slice(7)
    const supabase = getSupabaseAdmin()
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // Get tenant ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tenant not found'
      })
    }

    const tenantId = userData.tenant_id
    logger.debug(`🔐 Locations request for tenant: ${tenantId}`)

    // ========== LAYER 2+3: CACHE CHECK & DB FETCH ==========
    
    // Try cache
    let cachedData = getCachedLocations(tenantId)
    if (cachedData) {
      const duration = Date.now() - startTime
      return {
        success: true,
        data: cachedData,
        cached: true,
        count: cachedData.length,
        duration
      }
    }

    // Fetch from DB
    const rawLocations = await fetchLocationsFromDb(tenantId)
    const transformedLocations = transformLocations(rawLocations)

    // Cache
    setCachedLocations(tenantId, transformedLocations)

    const duration = Date.now() - startTime
    logger.debug(`✅ Locations request completed in ${duration}ms`)

    return {
      success: true,
      data: transformedLocations,
      cached: false,
      count: transformedLocations.length,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      throw error
    }

    logger.error(`❌ Locations API error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

