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
 */

import { defineEventHandler, readBody, createError, getHeader, getCookie } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthCookies, setAuthCookies } from '~/server/utils/cookies'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🔄 Token refresh requested')

    // Get refresh token from HTTP-Only cookie
    const { accessToken, refreshToken } = getAuthCookies(event)

    // 🔎 DIAGNOSTIC: capture the request context so we can see in Vercel logs
    // WHY this endpoint keeps getting hit (split-session, native app, which page).
    const ua = getHeader(event, 'user-agent') || ''
    const isNativeApp = /capacitor|simy|wkwebview/i.test(ua) || !/mozilla.*safari/i.test(ua) && /mobile/i.test(ua)
    logger.warn('🔎 [refresh-diag] /api/auth/refresh called', {
      hasAccessCookie: !!accessToken,
      hasRefreshCookie: !!refreshToken,
      // Split-session signature: access cookie present but refresh cookie gone,
      // OR neither present in a native webview that DOES have a localStorage session.
      likelySplitSession: !!accessToken && !refreshToken,
      isNativeApp,
      referer: getHeader(event, 'referer') || getHeader(event, 'x-nuxt-route') || 'unknown',
      origin: getHeader(event, 'origin') || 'unknown',
      userAgent: ua.slice(0, 120)
    })

    if (!refreshToken) {
      logger.warn('⚠️ No refresh token found in cookies', { hasAccessCookie: !!accessToken, isNativeApp })
      throw createError({
        statusCode: 401,
        statusMessage: 'No refresh token available'
      })
    }

    logger.debug('✅ Refresh token found, attempting refresh...')

    // Create Supabase client with service role
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Use refreshSession to get new tokens
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (error || !data.session) {
      logger.warn('❌ Token refresh failed:', error?.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Refresh token expired or invalid. Please log in again.'
      })
    }

    logger.debug('✅ Tokens refreshed successfully')

    // Determine if this is a "Remember Me" session based on refresh token maxAge
    // If refresh token has long TTL (7 days), use Remember Me settings
    const refreshTokenTTL = data.session.expires_in || 3600
    const isRememberMeSession = refreshTokenTTL > (24 * 60 * 60) // > 1 day = remember me
    
    // Set new HTTP-Only cookies with updated tokens
    setAuthCookies(event, data.session.access_token, data.session.refresh_token, {
      rememberMe: isRememberMeSession
    })

    logger.debug('✅ New cookies set', { isRememberMeSession })

    return {
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at
      }
    }

  } catch (error: any) {
    logger.error('❌ Token refresh error:', error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Token refresh failed'
    })
  }
})
