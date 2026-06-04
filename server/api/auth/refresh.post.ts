/**
 * POST /api/auth/refresh
 * 
 * Refreshes authentication tokens using Supabase refresh token.
 * Called by the client when tokens are about to expire.
 * 
 * Security:
 * ✅ Uses HTTP-Only refresh_token cookie (not accessible to JS)
 * ✅ Returns new tokens to client
 * ✅ Sets new HTTP-Only cookies
 * ✅ Supports "Remember Me" sessions
 * ✅ Per-IP rate limit so a stuck/misbehaving client can't hammer this endpoint
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getAuthCookies, setAuthCookies } from '~/server/utils/cookies'
import { refreshSessionDeduped } from '~/server/utils/token-refresh'
import { logger } from '~/utils/logger'

// Lightweight in-memory rate limit (per warm serverless instance). A legitimate
// client refreshes at most once every several minutes, so a tight window is safe.
// This stops a stuck client (e.g. an old cached bundle in a redirect loop) from
// hammering the endpoint several times per second.
const REFRESH_RL_WINDOW_MS = 10_000
const REFRESH_RL_MAX = 6
const refreshHits = new Map<string, number[]>()

function getClientIp(event: any): string {
  const fwd = getHeader(event, 'x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const realIp = getHeader(event, 'x-real-ip')
  if (realIp) return realIp
  return event.node.req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (refreshHits.get(ip) || []).filter(t => t > now - REFRESH_RL_WINDOW_MS)
  recent.push(now)
  refreshHits.set(ip, recent)
  // Opportunistic cleanup to keep the map small
  if (refreshHits.size > 5000) {
    for (const [key, arr] of refreshHits.entries()) {
      if (!arr.some(t => t > now - REFRESH_RL_WINDOW_MS)) refreshHits.delete(key)
    }
  }
  return recent.length > REFRESH_RL_MAX
}

export default defineEventHandler(async (event) => {
  // Rate limit before doing any work
  const ip = getClientIp(event)
  if (isRateLimited(ip)) {
    // Quiet: this is expected for misbehaving clients; don't spam error logs.
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many refresh attempts. Please wait a moment.'
    })
  }

  // No refresh cookie → nothing to do. This is a normal/expected case for guests
  // and split-session clients, so respond quietly without error-level logging.
  const { refreshToken } = getAuthCookies(event)
  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No refresh token available'
    })
  }

  try {
    logger.debug('✅ Refresh token found, attempting refresh...')

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    // Deduplicated refresh: parallel refresh calls reusing the same rotated
    // (single-use) refresh token would otherwise fail with "already used".
    const session = await refreshSessionDeduped(refreshToken)

    if (!session) {
      logger.warn('❌ Token refresh failed')
      throw createError({
        statusCode: 401,
        statusMessage: 'Refresh token expired or invalid. Please log in again.'
      })
    }

    logger.debug('✅ Tokens refreshed successfully')

    // Determine if this is a "Remember Me" session based on refresh token maxAge
    const refreshTokenTTL = session.expires_in || 3600
    const isRememberMeSession = refreshTokenTTL > (24 * 60 * 60) // > 1 day = remember me

    setAuthCookies(event, session.access_token, session.refresh_token, {
      rememberMe: isRememberMeSession
    })

    logger.debug('✅ New cookies set', { isRememberMeSession })

    return {
      success: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at
      }
    }

  } catch (error: any) {
    // Re-throw known HTTP errors (401/500 above) without noisy logging.
    if (error.statusCode) {
      throw error
    }

    logger.error('❌ Token refresh error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Token refresh failed'
    })
  }
})
