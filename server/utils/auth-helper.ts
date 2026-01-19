/**
 * Supabase Auth Helper for HTTP-Only Cookies
 * 
 * Extracts authentication token from either:
 * 1. Authorization Bearer header (for API calls with explicit token)
 * 2. HTTP-Only Supabase cookies (for browser-based requests)
 * 3. Cookie header (fallback)
 */

import { getHeader, getCookie } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * Extract authentication token from request
 * Supports both Bearer header and HTTP-Only cookies
 */
export const getAuthToken = (event: any): string | null => {
  // Try 1: Bearer token in Authorization header
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    logger.debug('🔐 Auth token from Authorization header')
    return authHeader.slice(7)
  }

  // Try 2: HTTP-Only cookie (Supabase auth-token or sb-access-token)
  let token = getCookie(event, 'sb-access-token')
  if (token) {
    logger.debug('🔐 Auth token from sb-access-token cookie')
    return token
  }

  // Try 3: Alternative cookie name
  token = getCookie(event, 'auth-token')
  if (token) {
    logger.debug('🔐 Auth token from auth-token cookie')
    return token
  }

  // Try 4: Look for any cookie containing auth token
  const cookieHeader = getHeader(event, 'cookie')
  if (cookieHeader) {
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/)
    if (tokenMatch) {
      logger.debug('🔐 Auth token from cookie header')
      return tokenMatch[1]
    }
  }

  logger.warn('❌ No authentication token found')
  return null
}

/**
 * Verify auth token and get authenticated user
 */
export const verifyAuth = async (event: any): Promise<{ userId: string; authUserId: string; tenantId: string } | null> => {
  try {
    const token = getAuthToken(event)
    if (!token) {
      logger.warn('❌ No token provided')
      return null
    }

    const supabase = getSupabaseAdmin()
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user?.id) {
      logger.warn('❌ Invalid token:', authError?.message)
      return null
    }

    const authUserId = user.id
    logger.debug(`✅ Token verified for auth user: ${authUserId}`)

    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError || !userData?.id) {
      logger.warn(`❌ User not found for auth_user_id: ${authUserId}`)
      return null
    }

    logger.debug(`✅ User found: ${userData.id} (tenant: ${userData.tenant_id})`)

    return {
      userId: userData.id,
      authUserId,
      tenantId: userData.tenant_id
    }
  } catch (err: any) {
    logger.error('❌ Unexpected error in verifyAuth:', err)
    return null
  }
}

