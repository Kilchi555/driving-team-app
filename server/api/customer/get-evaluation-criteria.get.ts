import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * Secure API to fetch evaluation criteria for authenticated user's tenant
 * 
 * Security:
 * - ✅ Requires authentication (Bearer token)
 * - ✅ Tenant isolation (only user's tenant criteria)
 * - ✅ Rate limiting per user
 * - ✅ Audit logging
 * - ✅ Input validation (required IDs parameter)
 */
export default defineEventHandler(async (event) => {
  try {
    // 1. Extract and validate auth token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('🔒 get-evaluation-criteria: Missing or invalid auth header')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.slice(7)

    // 2. Verify token and get user
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      logger.warn('🔒 get-evaluation-criteria: Invalid token', { error: authError?.message })
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // 3. Get user's tenant_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('🔒 get-evaluation-criteria: User profile not found', { userId: user.id })
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // 4. Rate limiting per user (20 requests per minute)
    const cacheKey = `rate:criteria:${user.id}`
    const count = checkRateLimit(cacheKey, 20, 60_000)
    if (count === null) {
      logger.warn('🔒 get-evaluation-criteria: Rate limit exceeded', { userId: user.id })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests'
      })
    }

    // 5. Parse IDs from query parameter
    const query = getQuery(event)
    if (!query.ids) {
      logger.warn('🔒 get-evaluation-criteria: Missing IDs parameter')
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing ids parameter'
      })
    }

    let criteriaIds: string[] = []
    try {
      const idsParam = Array.isArray(query.ids) ? query.ids : [query.ids]
      criteriaIds = idsParam
        .map((id: string) => {
          // Validate UUID format
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            throw new Error(`Invalid UUID: ${id}`)
          }
          return id
        })

      if (criteriaIds.length === 0) {
        throw new Error('At least one ID required')
      }

      // Max 100 IDs per request to prevent DoS
      if (criteriaIds.length > 100) {
        throw new Error('Too many IDs (max 100)')
      }
    } catch (err: any) {
      logger.warn('🔒 get-evaluation-criteria: Invalid IDs parameter', { error: err.message })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ids parameter'
      })
    }

    // 6. Fetch evaluation criteria with tenant isolation
    const { data: criteria, error: criteriaError } = await supabaseAdmin
      .from('evaluation_criteria')
      .select(`
        id,
        name,
        description,
        category_id,
        evaluation_categories!inner(
          id,
          name,
          tenant_id
        )
      `)
      .eq('evaluation_categories.tenant_id', userProfile.tenant_id)
      .in('id', criteriaIds)

    if (criteriaError) {
      logger.error('🔒 get-evaluation-criteria: Error fetching criteria', {
        userId: user.id,
        tenantId: userProfile.tenant_id,
        error: criteriaError.message
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch criteria'
      })
    }

    // 7. Audit log
    logger.info('✅ get-evaluation-criteria: Criteria fetched', {
      userId: user.id,
      tenantId: userProfile.tenant_id,
      requested: criteriaIds.length,
      returned: criteria?.length || 0
    })

    return {
      success: true,
      data: criteria || []
    }
  } catch (err: any) {
    logger.error('❌ get-evaluation-criteria: Error', {
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

