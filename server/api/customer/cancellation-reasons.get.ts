/**
 * GET /api/customer/cancellation-reasons
 * 
 * Fetch available cancellation reasons
 * 3-Layer: Auth → Transform → DB + Cache
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

const CACHE_DURATION = 60 * 60 * 1000 // 60 minutes (config data)
const reasonsCache = new Map<string, { data: any; timestamp: number }>()

/**
 * LAYER 2: Transform
 */
const transformReasons = (reasons: any[]): any[] => {
  return reasons
    .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
    .map(reason => ({
      id: reason.id,
      name: reason.name || '',
      type: reason.cancellation_type,
      description: reason.description || '',
      sortOrder: reason.sort_order || 999,
      chargePercentage: reason.charge_percentage || 0,
      requiresMedicalCert: reason.requires_medical_certificate || false
    }))
}

/**
 * LAYER 3: DB + Cache
 */
const fetchReasonsFromDb = async (tenantId: string): Promise<any[]> => {
  const supabase = getSupabaseAdmin()
  
  try {
    logger.debug(`📋 Fetching cancellation reasons for tenant: ${tenantId}`)
    
    const { data, error } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('cancellation_type', 'student')
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) {
      logger.error(`❌ Database error:`, error)
      return []
    }
    
    logger.debug(`✅ Fetched ${data?.length || 0} cancellation reasons`)
    return data || []
  } catch (err: any) {
    logger.error('❌ Unexpected error:', err)
    return []
  }
}

const getCachedReasons = (cacheKey: string): any[] | null => {
  const cached = reasonsCache.get(cacheKey)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    reasonsCache.delete(cacheKey)
    return null
  }
  
  logger.debug(`⚡ Cache HIT for cancellation reasons`)
  return cached.data
}

const setCachedReasons = (cacheKey: string, data: any[]): void => {
  reasonsCache.set(cacheKey, { data, timestamp: Date.now() })
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH ==========
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { tenantId } = auth
    const cacheKey = `reasons-${tenantId}`

    // ========== LAYER 2+3: CACHE + DB ==========
    
    let cachedData = getCachedReasons(cacheKey)
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
        count: cachedData.length,
        duration: Date.now() - startTime
      }
    }

    const rawReasons = await fetchReasonsFromDb(tenantId)
    const transformed = transformReasons(rawReasons)
    setCachedReasons(cacheKey, transformed)

    return {
      success: true,
      data: transformed,
      cached: false,
      count: transformed.length,
      duration: Date.now() - startTime
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ Error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})

