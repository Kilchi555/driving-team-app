// server/utils/progressive-rate-limiter.ts
// Progressive rate limiting based on failed attempts
import { checkRateLimit } from './rate-limiter'
import { logger } from '~/utils/logger'

export interface ProgressiveRateLimitConfig {
  action: string
  defaultLimit: number
  defaultWindow: number
  progressiveThresholds: {
    failedAttempts: number
    limit: number
    window: number
  }[]
}

/**
 * Progressive rate limiting that gets stricter after failed attempts
 * Example:
 * - 0-2 failed attempts: 10 requests/hour
 * - 3-5 failed attempts: 5 requests/hour
 * - 6-10 failed attempts: 2 requests/hour
 * - 10+ failed attempts: 1 request/hour
 */
export async function checkProgressiveRateLimit(
  key: string,
  action: string,
  failedAttempts: number = 0,
  defaultLimit: number = 10,
  defaultWindow: number = 3600
) {
  // Determine limit based on failed attempts
  let limit = defaultLimit
  let window = defaultWindow

  if (failedAttempts >= 10) {
    limit = 1
    window = 3600 // 1 per hour
    logger.debug(`🔒 STRICT rate limit for ${key}: ${limit}/hour (${failedAttempts} failed attempts)`)
  } else if (failedAttempts >= 6) {
    limit = 2
    window = 3600 // 2 per hour
    logger.debug(`⚠️ TIGHT rate limit for ${key}: ${limit}/hour (${failedAttempts} failed attempts)`)
  } else if (failedAttempts >= 3) {
    limit = 5
    window = 3600 // 5 per hour
    logger.debug(`⚠️ REDUCED rate limit for ${key}: ${limit}/hour (${failedAttempts} failed attempts)`)
  } else {
    limit = defaultLimit
    window = defaultWindow
    logger.debug(`✅ NORMAL rate limit for ${key}: ${limit}/${window}s (${failedAttempts} failed attempts)`)
  }

  return checkRateLimit(key, action, limit, window)
}

/**
 * Get failed attempts count from database
 */
export async function getFailedAttempts(
  identifier: string, // email or IP
  action: string,
  windowHours: number = 24
): Promise<number> {
  try {
    const { getSupabaseAdmin } = await import('~/utils/supabase')
    const supabase = getSupabaseAdmin()
    
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000)
    
    // Count failed attempts from audit_logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', action)
      .eq('status', 'failed')
      .gte('created_at', windowStart.toISOString())
      .or(`ip_address.eq.${identifier},details->>email.eq.${identifier}`)
    
    if (error) {
      logger.warn('⚠️ Error fetching failed attempts:', error)
      return 0
    }
    
    const count = data || 0
    logger.debug(`📊 Failed attempts for ${identifier}: ${count} in last ${windowHours}h`)
    
    return count as number
  } catch (error) {
    logger.warn('⚠️ Error in getFailedAttempts:', error)
    return 0
  }
}

/**
 * Check progressive rate limit with auto-fetch of failed attempts
 */
export async function checkProgressiveRateLimitWithHistory(
  identifier: string, // IP or email
  action: string,
  defaultLimit: number = 10,
  defaultWindow: number = 3600
) {
  const failedAttempts = await getFailedAttempts(identifier, action, 24)
  return checkProgressiveRateLimit(identifier, action, failedAttempts, defaultLimit, defaultWindow)
}

