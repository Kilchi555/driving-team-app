/**
 * Simple in-memory rate limiter
 * In production, use Redis for distributed rate limiting
 */

const requestLog = new Map<string, number[]>()

// Rate limit configurations for different operations
const LIMITS = {
  register: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  password_reset: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  login: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
}

export function checkRateLimit(
  ipAddress: string,
  operation: keyof typeof LIMITS = 'register',
  maxRequests?: number,
  windowMs?: number
): { allowed: boolean; remaining: number; limit: number; reset: number } {
  const now = Date.now()
  const config = LIMITS[operation]
  const max = maxRequests ?? config.maxRequests
  const window = windowMs ?? config.windowMs
  const key = `${operation}:${ipAddress}`
  
  // Get or create entry for this IP
  let timestamps = requestLog.get(key) || []
  
  // Remove old timestamps outside the window
  timestamps = timestamps.filter(ts => now - ts < window)
  
  // Check if limit exceeded
  const allowed = timestamps.length < max
  const remaining = Math.max(0, max - timestamps.length - 1)
  
  if (allowed) {
    // Add current request
    timestamps.push(now)
    requestLog.set(key, timestamps)
  }
  
  // Calculate reset time (when the oldest request leaves the window)
  let reset = 0
  if (timestamps.length > 0) {
    reset = timestamps[0] + window - now
  }
  
  // Cleanup old entries (older than 2 windows) - random cleanup
  if (Math.random() < 0.1) {
    for (const [k, v] of requestLog.entries()) {
      const filteredV = v.filter(ts => now - ts < window * 2)
      if (filteredV.length === 0) {
        requestLog.delete(k)
      } else {
        requestLog.set(k, filteredV)
      }
    }
  }
  
  return { allowed, remaining, limit: max, reset }
}

