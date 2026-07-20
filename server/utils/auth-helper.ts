/**
 * Thin wrappers around the shared auth helper in `~/server/utils/auth`.
 *
 * Historically this file reimplemented Bearer + cookie extraction and called
 * `auth.getUser(token)` directly — without the refresh-token fallback. That
 * caused recoverable expired-access-token requests to 401 while endpoints
 * using `getAuthenticatedUser` recovered fine.
 *
 * All user-auth entry points here now delegate to `getAuthenticatedUser`
 * (cookie + Bearer + refresh + cross-instance dedup).
 */

import { getHeader, getCookie } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Extract an access token from the request (Bearer header or sb-auth-token cookie).
 * Does NOT return the refresh token — that is not valid for `auth.getUser()`.
 */
export const getAuthToken = (event: any): string | null => {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    logger.debug('🔐 Auth token from Authorization header')
    return authHeader.slice(7)
  }

  const token = getCookie(event, 'sb-auth-token')
  if (token) {
    logger.debug('🔐 Auth token from sb-auth-token cookie')
    return token
  }

  logger.warn('❌ No authentication access token found')
  return null
}

/**
 * Get authenticated user from request.
 * Returns `{ id, email }` where `id` is the Supabase auth user id.
 */
export const getAuthUserFromRequest = async (event: any): Promise<{ id: string; email?: string } | null> => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user?.id) {
      logger.warn('❌ No authenticated user')
      return null
    }

    logger.debug(`✅ Token verified for auth user: ${user.id}`)
    return {
      id: user.id,
      email: user.email
    }
  } catch (err: any) {
    logger.error('❌ Unexpected error in getAuthUserFromRequest:', err)
    return null
  }
}

/**
 * Verify auth and resolve the database user + tenant.
 */
export const verifyAuth = async (event: any): Promise<{ userId: string; authUserId: string; tenantId: string } | null> => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user?.id) {
      logger.warn('❌ No authenticated user')
      return null
    }

    const userId = user.db_user_id || user.profile?.id
    const tenantId = user.tenant_id || user.profile?.tenant_id

    if (!userId || !tenantId) {
      logger.warn(`❌ User/tenant not resolved for auth_user_id: ${user.id}`)
      return null
    }

    logger.debug(`✅ User found: ${userId} (tenant: ${tenantId})`)

    return {
      userId,
      authUserId: user.id,
      tenantId
    }
  } catch (err: any) {
    logger.error('❌ Unexpected error in verifyAuth:', err)
    return null
  }
}
