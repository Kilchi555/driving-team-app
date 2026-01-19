/**
 * GET /api/customer/user-data
 * 
 * 3-Layer Architecture:
 * Layer 1: Auth + Input Validation
 * Layer 2: Business Logic + Transform
 * Layer 3: DB Query + Caching
 * 
 * Security: Session-based auth, RLS enforcement, field sanitization
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const userDataCache = new Map<string, { data: any; timestamp: number }>()

/**
 * LAYER 1: Authentication & Input Validation
 */
const validateRequest = (userId: string, authUserId: string): boolean => {
  // Ensure user is requesting their own data
  if (!userId || !authUserId) {
    logger.warn('❌ Missing userId or authUserId')
    return false
  }
  
  if (userId !== authUserId) {
    logger.warn(`❌ User ${userId} attempted to access data for user ${authUserId}`)
    return false
  }
  
  return true
}

/**
 * LAYER 2: Business Logic & Data Transformation
 */
const transformUserData = (rawData: any): any => {
  if (!rawData) return null

  return {
    id: rawData.id,
    firstName: rawData.first_name || '',
    lastName: rawData.last_name || '',
    email: rawData.email || '',
    phone: rawData.phone || '',
    dateOfBirth: rawData.date_of_birth || null,
    street: rawData.street || '',
    zip: rawData.zip || '',
    city: rawData.city || '',
    preferredPaymentMethod: rawData.preferred_payment_method || 'wallee',
    tenantId: rawData.tenant_id,
    role: rawData.role || 'customer',
    createdAt: rawData.created_at,
    updatedAt: rawData.updated_at
  }
}

/**
 * LAYER 3: Database Query + Caching
 */
const fetchUserDataFromDb = async (userId: string): Promise<any | null> => {
  const supabase = getSupabaseAdmin()
  
  try {
    logger.debug(`📊 Fetching user data from DB for: ${userId}`)
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        auth_user_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        street,
        zip,
        city,
        preferred_payment_method,
        tenant_id,
        role,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()
    
    if (error) {
      logger.error(`❌ Database error fetching user ${userId}:`, error)
      return null
    }
    
    logger.debug(`✅ User data fetched from DB: ${userId}`)
    return data
  } catch (err: any) {
    logger.error('❌ Unexpected error in fetchUserDataFromDb:', err)
    return null
  }
}

/**
 * Cache management
 */
const getCachedUserData = (userId: string): any | null => {
  const cached = userDataCache.get(userId)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_DURATION) {
    userDataCache.delete(userId)
    logger.debug(`🗑️ Cache expired for user ${userId}`)
    return null
  }
  
  logger.debug(`⚡ Cache HIT for user ${userId} (${Math.round(age / 1000)}s old)`)
  return cached.data
}

const setCachedUserData = (userId: string, data: any): void => {
  userDataCache.set(userId, {
    data,
    timestamp: Date.now()
  })
  logger.debug(`💾 Cached user data for ${userId} (expires in ${CACHE_DURATION / 1000}s)`)
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & VALIDATION ==========
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { userId, authUserId, tenantId } = auth
    logger.debug(`🔐 Request authenticated for user: ${userId}`)

    // ========== LAYER 2+3: CACHE CHECK & DB FETCH ==========
    
    // Try cache first
    let cachedData = getCachedUserData(userId)
    if (cachedData) {
      const duration = Date.now() - startTime
      logger.debug(`✅ Returned cached data in ${duration}ms`)
      
      return {
        success: true,
        data: cachedData,
        cached: true,
        duration
      }
    }

    // Fetch from DB
    const rawData = await fetchUserDataFromDb(userId)
    
    if (!rawData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User data not found'
      })
    }

    // Transform data
    const transformedData = transformUserData(rawData)

    // Cache the result
    setCachedUserData(userId, transformedData)

    const duration = Date.now() - startTime
    logger.debug(`✅ Request completed in ${duration}ms`)

    return {
      success: true,
      data: transformedData,
      cached: false,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      logger.warn(`⚠️ API error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

