/**
 * GET /api/customer/evaluation-criteria
 * 
 * Fetch evaluation criteria
 * 3-Layer: Auth → Transform → DB + Cache
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

const CACHE_DURATION = 60 * 60 * 1000 // 60 minutes
const criteriaCache = new Map<string, { data: any; timestamp: number }>()

/**
 * LAYER 2: Transform
 */
const transformCriteria = (criteria: any[]): any[] => {
  return criteria.map(c => ({
    id: c.id,
    name: c.name || '',
    description: c.description || '',
    category: c.category_name || 'General',
    shortCode: c.short_code || '',
    sortOrder: c.sort_order || 999
  }))
}

/**
 * LAYER 3: DB + Cache
 */
const fetchCriteriaFromDb = async (tenantId: string): Promise<any[]> => {
  const supabase = getSupabaseAdmin()
  
  try {
    logger.debug(`📊 Fetching evaluation criteria for tenant: ${tenantId}`)
    
    const { data, error } = await supabase
      .from('evaluation_criteria')
      .select('id, name, description, category_name, short_code, sort_order')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) {
      logger.error(`❌ Database error:`, error)
      return []
    }
    
    logger.debug(`✅ Fetched ${data?.length || 0} evaluation criteria`)
    return data || []
  } catch (err: any) {
    logger.error('❌ Unexpected error:', err)
    return []
  }
}

const getCachedCriteria = (cacheKey: string): any[] | null => {
  const cached = criteriaCache.get(cacheKey)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    criteriaCache.delete(cacheKey)
    return null
  }
  logger.debug(`⚡ Cache HIT for evaluation criteria`)
  return cached.data
}

const setCachedCriteria = (cacheKey: string, data: any[]): void => {
  criteriaCache.set(cacheKey, { data, timestamp: Date.now() })
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
    const cacheKey = `criteria-${tenantId}`

    // ========== LAYER 2+3: CACHE + DB ==========
    
    let cachedData = getCachedCriteria(cacheKey)
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
        count: cachedData.length,
        duration: Date.now() - startTime
      }
    }

    const rawCriteria = await fetchCriteriaFromDb(tenantId)
    const transformed = transformCriteria(rawCriteria)
    setCachedCriteria(cacheKey, transformed)

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

