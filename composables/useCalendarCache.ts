import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

// ✅ Cache for calendar data that doesn't change during modal open
// Prevents re-fetching external-busy-times, appointments, pending-appointments
interface CacheEntry<T> {
  data: T | null
  timestamp: number
  ttl: number // milliseconds
}

const cache = new Map<string, CacheEntry<any>>()

export const useCalendarCache = () => {
  // Cache TTL: 5 minutes for calendar data
  const DEFAULT_TTL = 5 * 60 * 1000

  const getCacheKey = (endpoint: string, params?: Record<string, any>) => {
    if (!params || Object.keys(params).length === 0) {
      return endpoint
    }
    const queryString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('&')
    return `${endpoint}?${queryString}`
  }

  const isExpired = (entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp > entry.ttl
  }

  const getOrFetch = async <T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> => {
    const cacheKey = getCacheKey(endpoint, params)

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && !isExpired(cached)) {
      logger.debug(`📦 Using cached data for ${cacheKey} (age: ${Date.now() - cached.timestamp}ms)`)
      return cached.data
    }

    logger.debug(`🔄 Fetching ${cacheKey}...`)
    const startTime = Date.now()
    
    try {
      const data = await fetcher()
      const fetchTime = Date.now() - startTime
      
      // Store in cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl
      })
      
      logger.debug(`✅ Fetched ${cacheKey} in ${fetchTime}ms`)
      return data
    } catch (error: any) {
      logger.error(`❌ Failed to fetch ${cacheKey}:`, error.message)
      throw error
    }
  }

  const clearCache = () => {
    logger.debug(`🗑️ Clearing calendar cache (${cache.size} entries)`)
    cache.clear()
  }

  const invalidate = (endpoint: string, params?: Record<string, any>) => {
    const cacheKey = getCacheKey(endpoint, params)
    if (cache.delete(cacheKey)) {
      logger.debug(`🗑️ Invalidated cache for ${cacheKey}`)
    }
  }

  const getCacheStats = () => {
    return {
      size: cache.size,
      entries: Array.from(cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        expired: isExpired(value)
      }))
    }
  }

  return {
    getOrFetch,
    clearCache,
    invalidate,
    getCacheStats
  }
}
