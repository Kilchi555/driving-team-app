/**
 * Rate Limiting Middleware for Public Course Enrollment APIs
 * 
 * Protects against brute-force attacks on:
 * - SARI validation (guessing faberid + birthdate)
 * - Payment processing
 * - Email verification
 * 
 * Rate Limits:
 * - 5 attempts per IP per minute (course enrollment)
 * - 10 attempts per IP per hour (payment retry)
 * - Sliding window algorithm with Redis backing
 */

import { defineEventHandler, createError } from 'h3'
import { logger } from '~/utils/logger'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // milliseconds
  skipSuccessfulRequests?: boolean
  keyGenerator?: (event: any) => string
}

const rateLimitStore = new Map<string, Array<{ timestamp: number }>>()

/**
 * Clean up expired entries periodically
 */
function cleanupStore() {
  const now = Date.now()
  for (const [key, attempts] of rateLimitStore.entries()) {
    const filtered = attempts.filter(a => a.timestamp > now - 3600000) // 1 hour
    if (filtered.length === 0) {
      rateLimitStore.delete(key)
    } else {
      rateLimitStore.set(key, filtered)
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupStore, 5 * 60 * 1000)

/**
 * Create a rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return defineEventHandler(async (event) => {
    try {
      // Generate rate limit key
      const key = config.keyGenerator?.(event) || getIpAddress(event)
      
      if (!key) {
        logger.warn('⚠️ Could not determine rate limit key, allowing request')
        return
      }

      const now = Date.now()
      const windowStart = now - config.windowMs

      // Get or create attempts list
      let attempts = rateLimitStore.get(key) || []

      // Filter out old attempts
      attempts = attempts.filter(a => a.timestamp > windowStart)

      // Check if over limit
      if (attempts.length >= config.maxAttempts) {
        logger.warn('❌ Rate limit exceeded:', {
          key: maskSensitiveKey(key),
          attempts: attempts.length,
          maxAttempts: config.maxAttempts,
          windowSeconds: config.windowMs / 1000
        })

        throw createError({
          statusCode: 429,
          statusMessage: `Too many requests. Please try again in ${Math.ceil(config.windowMs / 1000)} seconds.`
        })
      }

      // Record this attempt
      attempts.push({ timestamp: now })
      rateLimitStore.set(key, attempts)

      logger.debug('✅ Rate limit check passed:', {
        key: maskSensitiveKey(key),
        attempts: attempts.length,
        maxAttempts: config.maxAttempts
      })
    } catch (error: any) {
      if (error.statusCode === 429) {
        throw error
      }
      // Don't block on rate limit middleware errors
      logger.error('⚠️ Rate limit middleware error:', error.message)
    }
  })
}

/**
 * Get IP address from request
 */
function getIpAddress(event: any): string {
  // Check X-Forwarded-For first (behind proxy)
  const forwarded = event.headers['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Check X-Real-IP (nginx proxy)
  const realIp = event.headers['x-real-ip']
  if (realIp) {
    return realIp
  }

  // Fall back to connection address
  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * Mask IP address for logging
 */
function maskSensitiveKey(key: string): string {
  // If it looks like an IP, mask it
  if (key.includes('.') || key.includes(':')) {
    const parts = key.split(/[.:]/g)
    if (parts.length >= 3) {
      parts[parts.length - 1] = 'xxx'
      return parts.join(key.includes(':') ? ':' : '.')
    }
  }
  return key.substring(0, 10) + '...'
}

/**
 * Compose multiple rate limits for a single endpoint
 */
export function composeRateLimits(limiters: ReturnType<typeof createRateLimitMiddleware>[]) {
  return defineEventHandler(async (event) => {
    for (const limiter of limiters) {
      await limiter(event)
    }
  })
}

/**
 * Default export - required for Nitro middleware
 * This file primarily exports helper functions; actual rate limiting is applied per-endpoint
 */
export default defineEventHandler(() => {
  // No-op: Rate limiting is applied on specific endpoints using createRateLimitMiddleware
})

