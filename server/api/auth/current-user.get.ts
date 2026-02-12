import { defineEventHandler, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

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
    // Get page info for debugging
    const referer = getHeader(event, 'referer') || 'unknown'
    const userAgent = getHeader(event, 'user-agent')?.substring(0, 60) || 'unknown'
    
    // Get authenticated user (via middleware that converts cookies to headers)
    const authUser = await getAuthenticatedUser(event)
    
    if (!authUser) {
      logger.warn('❌ [current-user] No authenticated user found', {
        referer,
        page: extractPageFromReferer(referer),
        userAgent
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    logger.debug(`✅ [current-user] User authenticated: ${authUser.email}`, {
      referer,
      page: extractPageFromReferer(referer)
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
      referer,
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

// Helper function to extract page path from referer URL
function extractPageFromReferer(referer: string): string {
  try {
    const url = new URL(referer)
    return url.pathname + url.search
  } catch (e) {
    return referer
  }
}


