import { defineEventHandler, createError } from 'h3'
import { clearAuthCookies, getAuthCookies } from '~/server/utils/cookies'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { accessToken } = getAuthCookies(event)
    
    if (!accessToken) {
      logger.debug('⚠️ Logout called but no session cookie found')
      // Still clear cookies just in case
      clearAuthCookies(event)
      return { success: true, message: 'Already logged out' }
    }
    
    logger.debug('🔓 Logging out user, clearing cookies')
    
    // Clear httpOnly cookies
    clearAuthCookies(event)
    
    logger.debug('✅ Session cookies cleared')
    
    return {
      success: true,
      message: 'Logged out successfully'
    }
  } catch (error: any) {
    logger.error('❌ Logout error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Logout failed'
    })
  }
})

