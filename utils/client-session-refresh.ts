// utils/client-session-refresh.ts
//
// Single-flight, client-side wrapper around POST /api/auth/refresh.
//
// WHY THIS EXISTS
// ---------------
// The app has several independent refreshers that each, on their own, call the
// cookie-based refresh endpoint:
//   • plugins/02-supabase-auth-interceptor.client.ts (proactive interval refresh)
//   • plugins/auth-restore.client.ts                  (session restore on load)
//   • pages/upgrade.vue & pages/admin/billing.vue     (token resolution for Stripe)
//
// On a serverless backend (Vercel) each parallel call can land on a DIFFERENT
// lambda instance whose per-process dedup cache (server/utils/token-refresh.ts)
// is empty. They then all try to redeem the SAME single-use sb-refresh-token
// cookie → Supabase refresh-token rotation race → all but one get
// "refresh token already used" → 401. This is why the admin area (heaviest
// parallel load + longest sessions + the only Stripe consumer) 401s in
// production but never locally (one long-lived process → dedup always works).
//
// Funnelling EVERY client refresh through one in-flight promise guarantees the
// browser makes at most one /api/auth/refresh call at a time. Combined with the
// Supabase "refresh token reuse interval" this removes the cross-instance race.
//
// The helper also re-hydrates the Supabase client + localStorage so subsequent
// getSession() calls return a valid session.

import { logger } from '~/utils/logger'

export interface RefreshedSession {
  access_token: string
  refresh_token: string
  expires_in?: number
  expires_at?: number
}

// localStorage keys shared with 02-supabase-auth-interceptor.client.ts
const SUPABASE_SESSION_KEY = 'supabase-session-cache'
const LAST_REFRESH_KEY = 'last_token_refresh_time'

// Short window during which a just-completed refresh is reused for bursty
// parallel callers that arrive microseconds after the refresh resolved.
const REUSE_WINDOW_MS = 5_000

let inFlight: Promise<RefreshedSession | null> | null = null
let lastResult: { session: RefreshedSession; at: number } | null = null

async function hydrateClient(session: RefreshedSession): Promise<void> {
  try {
    const { getSupabase } = await import('~/utils/supabase')
    await getSupabase().auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  } catch {
    // Non-fatal: caller still has the token to use directly.
  }
  try {
    localStorage.setItem(
      SUPABASE_SESSION_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        timestamp: Date.now(),
      })
    )
    localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString())
  } catch {
    // localStorage may be unavailable (private mode) — non-fatal.
  }
}

/**
 * Refresh the session via the httpOnly refresh cookie, deduplicating concurrent
 * and rapid repeat calls across the whole client.
 *
 * @param options.force  Skip the short reuse window and the in-flight join is
 *                        still honoured (we never run two refreshes at once),
 *                        but a freshly-cached result is ignored.
 * @returns the new session, or null when the refresh cookie is dead (truly
 *          logged out).
 */
export async function refreshClientSession(
  options: { force?: boolean } = {}
): Promise<RefreshedSession | null> {
  // 1. Reuse a very recently minted session (covers parallel callers arriving
  //    right after a refresh completed).
  if (!options.force && lastResult && Date.now() - lastResult.at < REUSE_WINDOW_MS) {
    return lastResult.session
  }

  // 2. Join an already in-flight refresh — only one /api/auth/refresh at a time.
  if (inFlight) {
    return inFlight
  }

  // 3. Perform the single refresh.
  inFlight = (async (): Promise<RefreshedSession | null> => {
    try {
      const refreshed = await $fetch<{ session: RefreshedSession }>('/api/auth/refresh', {
        method: 'POST',
      })
      const session = refreshed?.session
      if (!session?.access_token || !session?.refresh_token) {
        return null
      }
      await hydrateClient(session)
      lastResult = { session, at: Date.now() }
      logger.debug('✅ refreshClientSession: token refreshed (single-flight)')
      return session
    } catch (err: any) {
      // 401 → refresh cookie dead (truly logged out). 429 → rate limited.
      logger.debug('⚠️ refreshClientSession failed:', err?.statusCode || err?.message)
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
