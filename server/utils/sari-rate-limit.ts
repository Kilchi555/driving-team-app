/**
 * SARI API Rate Limiting Configuration
 * Extends the existing rate-limiter with SARI-specific configurations
 */

import { checkRateLimit } from './rate-limiter'

// SARI API Rate Limits (per user, not per IP)
export const SARI_LIMITS = {
  enroll_student: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 60 per minute per user
  },
  unenroll_student: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 60 per minute per user
  },
  validate_student: {
    maxRequests: 120,
    windowMs: 60 * 1000, // 120 per minute per user (validation is lightweight)
  },
  test_participants: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 per minute per user (admin testing)
  },
}

/**
 * Check rate limit for SARI API endpoints
 * Uses user_id instead of IP for SARI (they're authenticated)
 */
export async function checkSARIRateLimit(
  userId: string,
  operation: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const config = SARI_LIMITS[operation as keyof typeof SARI_LIMITS]
    
    if (!config) {
      console.warn(`No rate limit config for SARI operation: ${operation}`)
      return { allowed: true }
    }

    // Use user_id as the limiter key (authenticated users)
    const key = `sari:${userId}:${operation}`
    
    const result = await checkRateLimit(key, config.maxRequests, config.windowMs)
    
    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter,
    }
  } catch (error) {
    console.error('Error checking SARI rate limit:', error)
    // Fail open: allow request if rate limiter fails
    return { allowed: true }
  }
}

/**
 * Format rate limit error response
 */
export function formatRateLimitError(retryAfter: number) {
  const seconds = Math.ceil(retryAfter / 1000)
  return {
    statusCode: 429,
    statusMessage: `Rate limit exceeded. Please try again in ${seconds} seconds.`,
    retryAfter: seconds,
  }
}

/**
 * Validate SARI input parameters
 */
export function validateSARIInput(params: any) {
  const errors: string[] = []

  // UUID validation pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Check courseSessionId if provided
  if (params.courseSessionId && !uuidPattern.test(params.courseSessionId)) {
    errors.push('Invalid courseSessionId format')
  }

  // Check studentId if provided
  if (params.studentId && !uuidPattern.test(params.studentId)) {
    errors.push('Invalid studentId format')
  }

  // Check birthdate if provided
  if (params.birthdate) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(params.birthdate)) {
      errors.push('Invalid birthdate format (expected YYYY-MM-DD)')
    }
  }

  // Check FABERID if provided (should be alphanumeric)
  if (params.faberid) {
    const faberiPattern = /^[a-zA-Z0-9]+$/
    if (!faberiPattern.test(params.faberid.trim())) {
      errors.push('Invalid FABERID format')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitize SARI parameters to prevent injection
 */
export function sanitizeSARIInput(params: any) {
  return {
    courseSessionId: params.courseSessionId?.trim(),
    studentId: params.studentId?.trim(),
    faberid: params.faberid?.trim().toUpperCase(),
    birthdate: params.birthdate?.trim(),
  }
}

