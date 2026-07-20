import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Secure API to fetch locations for authenticated user's tenant
 * 
 * Security:
 * - ✅ Requires authentication (Bearer token)
 * - ✅ Tenant isolation (only user's tenant locations)
 * - ✅ Rate limiting per user
 * - ✅ Audit logging
 * - ✅ Input validation (optional IDs parameter)
 */
export default defineEventHandler(async (event) => {
  try {
    // 1. Auth (cookie + Bearer + refresh fallback)
    const user = await getAuthenticatedUser(event)
    if (!user) {
      logger.warn('🔒 get-locations: Missing or invalid session')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // 2. Admin client for DB
    const supabaseAdmin = getSupabaseAdmin()

    // 3. Get user's tenant_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('🔒 get-locations: User profile not found', { userId: user.id })
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // 4. Rate limiting per user (20 requests per minute)
    const cacheKey = `rate:locations:${user.id}`
    const count = checkRateLimit(cacheKey, 20, 60_000)
    if (count === null) {
      logger.warn('🔒 get-locations: Rate limit exceeded', { userId: user.id })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests'
      })
    }

    // 5. Parse optional IDs query parameter
    const query = getQuery(event)
    let locationIds: string[] | null = null

    if (query.ids) {
      try {
        // Handle both array and comma-separated string
        const idsParam = Array.isArray(query.ids) 
          ? query.ids 
          : String(query.ids).split(',').map(id => id.trim())
        
        locationIds = idsParam
          .filter(Boolean) // Remove empty strings
          .map((id: string) => {
            // Validate UUID format
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
              throw new Error(`Invalid UUID: ${id}`)
            }
            return id
          })
      } catch (err: any) {
        logger.warn('🔒 get-locations: Invalid IDs parameter', { error: err.message })
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid IDs parameter'
        })
      }
    }

    // 6. Fetch locations with tenant isolation
    let query_builder = supabaseAdmin
      .from('locations')
      .select('id, name, address, formatted_address, created_at')
      .eq('tenant_id', userProfile.tenant_id)
      .order('name', { ascending: true })

    // If IDs provided, filter by those IDs as well
    if (locationIds && locationIds.length > 0) {
      query_builder = query_builder.in('id', locationIds)
    }

    const { data: locations, error: locationsError } = await query_builder

    if (locationsError) {
      logger.error('🔒 get-locations: Error fetching locations', {
        userId: user.id,
        tenantId: userProfile.tenant_id,
        error: locationsError.message
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch locations'
      })
    }

    // 7. Audit log
    logger.info('✅ get-locations: Locations fetched', {
      userId: user.id,
      tenantId: userProfile.tenant_id,
      count: locations?.length || 0,
      withFilter: !!locationIds
    })

    return {
      success: true,
      data: locations || []
    }
  } catch (err: any) {
    logger.error('❌ get-locations: Error', {
      statusCode: err.statusCode,
      message: err.message
    })
    throw err
  }
})

/**
 * Simple rate limit check using in-memory storage
 * For production, use Redis or similar
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(key: string, limit: number, windowMs: number): number | null {
  const now = Date.now()
  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetTime) {
    // New window or expired
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    return 1
  }

  entry.count++
  if (entry.count > limit) {
    return null // Rate limit exceeded
  }

  return entry.count
}

