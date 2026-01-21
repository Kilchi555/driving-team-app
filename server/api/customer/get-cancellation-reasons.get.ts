/**
 * GET /api/customer/get-cancellation-reasons
 * 
 * Fetch cancellation reasons for the customer's tenant
 * 3-Layer: Auth → Business Logic → DB Query
 * 
 * Security: Auth required, tenant isolation, rate limiting, cached
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Simple in-memory cache (per tenant)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

const checkRateLimit = (key: string): boolean => {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false
  }
  
  entry.count++
  return true
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & RATE LIMITING ==========
    
    // Rate limiting by IP
    const clientIP = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(`cancellation_reasons_${clientIP}`)) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests'
      })
    }

    // Auth check
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseAdmin()

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // Get user profile with tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    // ========== LAYER 2: CACHE CHECK ==========
    
    const cacheKey = `cancellation_reasons_${tenantId}`
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const duration = Date.now() - startTime
      logger.debug(`✅ Cancellation reasons from cache (${duration}ms)`)
      return {
        success: true,
        reasons: cached.data,
        cached: true,
        duration
      }
    }

    // ========== LAYER 3: DATABASE QUERY ==========
    
    const { data: reasons, error: queryError } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (queryError) {
      logger.error('❌ Error fetching cancellation reasons:', queryError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch cancellation reasons'
      })
    }

    // Update cache
    cache.set(cacheKey, { data: reasons || [], timestamp: Date.now() })

    const duration = Date.now() - startTime
    logger.debug(`✅ Cancellation reasons fetched (${duration}ms): ${reasons?.length || 0}`)

    return {
      success: true,
      reasons: reasons || [],
      cached: false,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      logger.warn(`⚠️ Cancellation reasons error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch cancellation reasons'
    })
  }
})

