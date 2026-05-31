/**
 * POST /api/auth/sync-session
 *
 * Called by the client when Supabase has a valid localStorage session but the
 * HTTP-only cookies are missing or expired (split-session scenario).
 *
 * The client passes its current access + refresh tokens; this endpoint
 * verifies them against Supabase and then writes fresh HTTP-only cookies so
 * that all server-side API routes can authenticate correctly again.
 *
 * Security:
 * ✅ Always verifies the access_token against the Supabase Auth API before
 *    setting any cookies — fake/forged tokens are rejected.
 * ✅ Returns only a success flag, never the tokens themselves.
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { setAuthCookies } from '~/server/utils/cookies'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { access_token, refresh_token } = body ?? {}

  // 🔎 DIAGNOSTIC: confirm the split-session fix path is actually being taken
  // (client synced its localStorage session into cookies instead of looping on refresh).
  logger.warn('🔎 [sync-diag] /api/auth/sync-session called', {
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token,
    referer: getHeader(event, 'referer') || 'unknown',
    userAgent: (getHeader(event, 'user-agent') || '').slice(0, 120)
  })

  if (!access_token || !refresh_token) {
    throw createError({ statusCode: 400, statusMessage: 'access_token and refresh_token are required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
  }

  // Verify the access token is real and not expired
  const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      apikey: supabaseKey
    }
  })

  if (!verifyResponse.ok) {
    logger.debug('⚠️ sync-session: access_token invalid or expired, trying refresh...')

    // Access token expired — try to refresh using the provided refresh token
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.auth.refreshSession({ refresh_token })

    if (error || !data.session) {
      logger.warn('⚠️ sync-session: refresh also failed — session truly expired')
      throw createError({ statusCode: 401, statusMessage: 'Session expired. Please log in again.' })
    }

    logger.debug('✅ sync-session: refreshed via refresh_token, setting new cookies')
    setAuthCookies(event, data.session.access_token, data.session.refresh_token)
    return { success: true, refreshed: true }
  }

  logger.debug('✅ sync-session: access_token valid, syncing cookies')
  setAuthCookies(event, access_token, refresh_token)
  return { success: true, refreshed: false }
})
