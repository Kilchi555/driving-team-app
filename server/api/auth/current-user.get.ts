import { defineEventHandler, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { urlWithoutQueryForLogs } from '~/utils/redact-sensitive-url'

/**
 * GET /api/auth/current-user
 * 
 * Returns current authenticated user info
 * Used by auth-restore plugin to restore session after page reload
 * 
 * Security:
 * - ✅ Requires valid authentication token (from httpOnly cookie)
 * - ✅ Returns only current user's data
 * - ✅ No access to other users' data
 */
export default defineEventHandler(async (event) => {
  try {
    // Get page info for debugging (never log query strings — invite tokens live there)
    const referer = getHeader(event, 'referer') || 'unknown'
    const userAgent = getHeader(event, 'user-agent')?.substring(0, 60) || 'unknown'
    const refererLog = urlWithoutQueryForLogs(referer)
    const page = extractPageFromReferer(referer)
    
    // Get authenticated user (via middleware that converts cookies to headers)
    const authUser = await getAuthenticatedUser(event)
    
    if (!authUser) {
      logger.warn('❌ [current-user] No authenticated user found', {
        referer: refererLog,
        page,
        userAgent
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    logger.debug(`✅ [current-user] User authenticated: ${authUser.email}`, {
      referer: refererLog,
      page
    })

    // Return user info without sensitive data
    return {
      user: {
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata || {}
      },
      profile: authUser.profile || null,
      success: true
    }

  } catch (error: any) {
    const referer = getHeader(event, 'referer') || 'unknown'
    logger.error('❌ [current-user] Error:', {
      message: error.message || error,
      referer: urlWithoutQueryForLogs(referer),
      page: extractPageFromReferer(referer),
      statusCode: error.statusCode
    })
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get current user'
    })
  }
})

// Pathname only — query strings on invite/reset pages are credentials.
function extractPageFromReferer(referer: string): string {
  try {
    return new URL(referer).pathname
  } catch {
    return 'unknown'
  }
}


