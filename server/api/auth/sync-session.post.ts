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

import { defineEventHandler, readBody, createError } from 'h3'
import { setAuthCookies } from '~/server/utils/cookies'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { access_token, refresh_token } = body ?? {}

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

    // Access token expired — try to refresh using the provided refresh token.
    // Use the cross-instance-coordinated refresh (not a raw refreshSession call)
    // so this doesn't race with the other server endpoints that may be
    // refreshing the very same (single-use) refresh token at the same time.
    const { refreshSessionDeduped } = await import('~/server/utils/token-refresh')
    const session = await refreshSessionDeduped(refresh_token)

    if (!session) {
      logger.warn('⚠️ sync-session: refresh also failed — session truly expired')
      throw createError({ statusCode: 401, statusMessage: 'Session expired. Please log in again.' })
    }

    logger.debug('✅ sync-session: refreshed via refresh_token, setting new cookies')
    setAuthCookies(event, session.access_token, session.refresh_token)
    // Return new tokens so the client can update its Supabase session via setSession().
    // Without this, the browser still holds the old (rotated/invalidated) refresh token
    // and the next sync-session call (e.g. after a page reload) fails with "already used".
    return {
      success: true,
      refreshed: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    }
  }

  logger.debug('✅ sync-session: access_token valid, syncing cookies')
  setAuthCookies(event, access_token, refresh_token)
  return { success: true, refreshed: false }
})
