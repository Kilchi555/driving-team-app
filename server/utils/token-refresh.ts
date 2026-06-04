import { createClient, type Session } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Single-flight + short-lived cache around Supabase `refreshSession`.
 *
 * WHY: Supabase rotates refresh tokens (single-use). When several server
 * endpoints receive the same expired access token at (nearly) the same time,
 * each one would independently call `refreshSession` with the SAME refresh
 * token. Only the first succeeds; every concurrent/subsequent call gets
 * "refresh token already used" → returns null → the request 401s, even though
 * the session is actually still valid. (Classic symptom: one endpoint OK, a
 * parallel endpoint 401 with the very same token.)
 *
 * This helper deduplicates by refresh token:
 *  1. If a refresh for this token is already in flight, await that result.
 *  2. If we refreshed this token very recently, reuse the freshly-minted
 *     session from the cache instead of calling Supabase again.
 *  3. Otherwise perform the refresh and cache the result under BOTH the old
 *     and new refresh token (so a retry with either value hits the cache).
 */

interface CachedSession {
  session: Session
  expiresAt: number
}

const CACHE_TTL_MS = 60_000

const inFlight = new Map<string, Promise<Session | null>>()
const cache = new Map<string, CachedSession>()

function pruneCache() {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) cache.delete(key)
  }
}

/**
 * Refresh a Supabase session, deduplicating concurrent/repeated calls that use
 * the same refresh token. Returns the new session or null if the refresh truly
 * failed (e.g. expired/revoked refresh token).
 */
export async function refreshSessionDeduped(refreshToken: string): Promise<Session | null> {
  const now = Date.now()

  // 1. Reuse a recently-minted session for this token (rotation race window).
  const cached = cache.get(refreshToken)
  if (cached && cached.expiresAt > now) {
    logger.debug('♻️ Reusing cached refreshed session (token rotation race avoided)')
    return cached.session
  }

  // 2. Join an in-flight refresh for the same token.
  const pending = inFlight.get(refreshToken)
  if (pending) {
    logger.debug('⏳ Joining in-flight token refresh (single-flight)')
    return pending
  }

  // 3. Perform the actual refresh.
  const promise = (async (): Promise<Session | null> => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      logger.error('❌ Supabase credentials not configured for token refresh')
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

    if (error || !data.session) {
      logger.warn('❌ Token refresh failed:', error?.message)
      return null
    }

    const entry: CachedSession = { session: data.session, expiresAt: Date.now() + CACHE_TTL_MS }
    cache.set(refreshToken, entry)
    if (data.session.refresh_token) {
      cache.set(data.session.refresh_token, entry)
    }
    pruneCache()

    return data.session
  })()

  inFlight.set(refreshToken, promise)
  try {
    return await promise
  } finally {
    inFlight.delete(refreshToken)
  }
}
