/**
 * Rate limiter using Supabase for persistent storage
 * This allows rate limits to work across multiple server instances
 * and be queryable for admin dashboard analytics
 * 
 * Features:
 * - Persistent storage in Supabase for cross-instance consistency
 * - In-memory cache for performance
 * - Exponential Backoff: repeated blocks increase wait time
 */

import { createClient } from '@supabase/supabase-js'

// In-memory cache for performance (5 minute TTL)
const requestCache = new Map<string, { count: number; resetTime: number; backoffLevel?: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Rate limit configurations for different operations
const LIMITS = {
  register: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  password_reset: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  login: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  process_payment: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  customer_get_payment_page_data: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  settle_and_email_payment: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  confirm_cash_payment: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  save_discount: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 per minute - testing (reduce later)
  cancel_appointment: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour (staff can cancel many appointments)
  cancel_staff: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour (staff cancellations)
  cancel_customer: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour (customer cancellations)
  use_credit_for_appointment: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // ✅ NEW: 50 per hour
}

// Exponential Backoff multipliers (in minutes)
// After N consecutive blocks, wait time = baseWindow * multiplier[N]
const BACKOFF_MULTIPLIERS = [
  1,    // 1st block: 1x (1 minute)
  2,    // 2nd block: 2x (2 minutes)
  5,    // 3rd block: 5x (5 minutes)
  15,   // 4th block: 15x (15 minutes)
  60,   // 5th block: 60x (1 hour)
  240,  // 6th+ block: 240x (4 hours)
]

let supabaseClient: any = null

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('⚠️ Supabase credentials not configured for rate limiter')
      return null
    }
    
    supabaseClient = createClient(supabaseUrl, serviceRoleKey)
  }
  
  return supabaseClient
}

/**
 * Calculate exponential backoff multiplier based on number of recent blocks
 * @param blockCount Number of consecutive blocks this IP has experienced
 * @returns multiplier to apply to base window
 */
function getBackoffMultiplier(blockCount: number): number {
  if (blockCount <= 0) return 1
  if (blockCount > BACKOFF_MULTIPLIERS.length) return BACKOFF_MULTIPLIERS[BACKOFF_MULTIPLIERS.length - 1]
  return BACKOFF_MULTIPLIERS[blockCount - 1]
}

/**
 * Count consecutive blocks for an IP (looking back 24 hours)
 * Used to determine exponential backoff level
 */
async function getConsecutiveBlockCount(
  supabase: any,
  operation: string,
  ipAddress: string
): Promise<number> {
  try {
    // Look at last 24 hours of attempts
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: recentLogs, error } = await supabase
      .from('rate_limit_logs')
      .select('status, created_at')
      .eq('operation', operation)
      .eq('ip_address', ipAddress)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(20) // Only need last 20 to find consecutive blocks
    
    if (error || !recentLogs) return 0
    
    // Count consecutive blocks from the end
    let consecutiveBlocks = 0
    for (const log of recentLogs) {
      if (log.status === 'blocked') {
        consecutiveBlocks++
      } else {
        // Stop counting at first allowed request
        break
      }
    }
    
    return consecutiveBlocks
  } catch (err) {
    console.warn('⚠️ Failed to calculate backoff:', err)
    return 0
  }
}

export async function checkRateLimit(
  ipAddress: string,
  operation: keyof typeof LIMITS | string = 'register',
  maxRequests?: number,
  windowMs?: number,
  email?: string,
  tenantId?: string
): Promise<{ allowed: boolean; remaining: number; limit: number; reset: number }> {
  const now = Date.now()
  const config = LIMITS[operation as keyof typeof LIMITS] || { maxRequests: maxRequests || 10, windowMs: windowMs || 60000 }
  const max = maxRequests ?? config.maxRequests
  const baseWindow = windowMs ?? config.windowMs
  const key = `${operation}:${ipAddress}`
  
  // Check in-memory cache first
  const cached = requestCache.get(key)
  if (cached && cached.resetTime > now) {
    const allowed = cached.count < max
    const remaining = Math.max(0, max - cached.count - 1)
    const reset = cached.resetTime - now
    
    if (allowed) {
      cached.count++
    }
    
    return { allowed, remaining, limit: max, reset }
  }
  
  // Query Supabase for requests in the time window
  const supabase = getSupabaseClient()
  const allowed = { allowed: true, remaining: max - 1, limit: max, reset: 0 }
  
  if (!supabase) {
    // Fallback to in-memory if Supabase not available
    return allowed
  }
  
  try {
    const windowStart = new Date(now - baseWindow).toISOString()

    // Run request count + consecutive block count in parallel (two DB reads at once)
    const [{ data: logs, error }, blockCount] = await Promise.all([
      supabase
        .from('rate_limit_logs')
        .select('status, created_at')
        .eq('operation', operation)
        .eq('ip_address', ipAddress)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true }),
      getConsecutiveBlockCount(supabase, operation, ipAddress),
    ])

    if (error) {
      console.warn('⚠️ Failed to query rate limit logs:', error.message)
      return allowed
    }

    const count = logs?.length || 0
    const isAllowed = count < max
    const remaining = Math.max(0, max - count - 1)
    const backoffMultiplier = getBackoffMultiplier(blockCount)
    const effectiveWindow = baseWindow * backoffMultiplier

    let resetTime = new Date(windowStart).getTime() + effectiveWindow
    if (logs && logs.length > 0 && logs[0].created_at) {
      resetTime = new Date(logs[0].created_at).getTime() + effectiveWindow
    }

    const reset = Math.max(0, resetTime - now)

    if (!isAllowed) {
      console.warn(`⛔ Rate limit exceeded for ${operation} from ${ipAddress} (${blockCount} consecutive blocks)`)
    }

    requestCache.set(key, {
      count: isAllowed ? count + 1 : count,
      resetTime,
      backoffLevel: blockCount
    })

    // Fire-and-forget: DB log insert never blocks the caller
    supabase
      .from('rate_limit_logs')
      .insert({
        operation,
        ip_address: ipAddress,
        email: email || null,
        status: isAllowed ? 'allowed' : 'blocked',
        request_count: count + 1,
        max_requests: max,
        window_seconds: Math.floor(baseWindow / 1000),
        tenant_id: tenantId || null
      })
      .then(() => {})
      .catch(() => {})

    return { allowed: isAllowed, remaining, limit: max, reset }
  } catch (err: any) {
    console.warn('⚠️ Rate limit check error:', err.message)
    return allowed
  }
}

// Cleanup old cache entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of requestCache.entries()) {
      if (value.resetTime + CACHE_TTL < now) {
        requestCache.delete(key)
      }
    }
  }, 60 * 1000) // Cleanup every minute
}

