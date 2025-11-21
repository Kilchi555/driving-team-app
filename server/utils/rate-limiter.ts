/**
 * Simple in-memory rate limiter
 * In production, use Redis for distributed rate limiting
 */

const requestLog = new Map<string, number[]>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 5 // Max 5 registrations per IP per minute

export function checkRateLimit(ipAddress: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = `register:${ipAddress}`
  
  // Get or create entry for this IP
  let timestamps = requestLog.get(key) || []
  
  // Remove old timestamps outside the window
  timestamps = timestamps.filter(ts => now - ts < WINDOW_MS)
  
  // Check if limit exceeded
  const allowed = timestamps.length < MAX_REQUESTS
  const remaining = Math.max(0, MAX_REQUESTS - timestamps.length - 1)
  
  if (allowed) {
    // Add current request
    timestamps.push(now)
    requestLog.set(key, timestamps)
  }
  
  // Cleanup old entries (older than 2 windows)
  if (Math.random() < 0.1) {
    for (const [k, v] of requestLog.entries()) {
      const filteredV = v.filter(ts => now - ts < WINDOW_MS * 2)
      if (filteredV.length === 0) {
        requestLog.delete(k)
      } else {
        requestLog.set(k, filteredV)
      }
    }
  }
  
  return { allowed, remaining }
}

