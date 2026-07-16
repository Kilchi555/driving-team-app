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
// The helper also re-hydrates the Supabase client so subsequent getSession()
// calls return a valid session.
//
// SECURITY: raw access/refresh tokens are intentionally NOT written to
// localStorage here. httpOnly cookies are the real, XSS-safe auth layer for
// server-side requests; the Supabase client's own (module-managed) storage
// covers client-side supabase-js calls. Duplicating the tokens into plain
// localStorage would let any injected/XSS script read a fully usable session
// straight out of `localStorage`, defeating the purpose of httpOnly cookies.
// We still record a plain timestamp (no secret material) so the proactive
// refresh interval in 02-supabase-auth-interceptor.client.ts knows when it
// last ran.

import { logger } from '~/utils/logger'

export interface RefreshedSession {
  access_token: string
  refresh_token: string
  expires_in?: number
  expires_at?: number
}

// Non-secret timestamp only — shared with 02-supabase-auth-interceptor.client.ts
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

/**
 * Drop the cached/in-flight refresh result. Must be called on logout —
 * otherwise a refresh completed just before logout can be replayed to
 * bursty callers inside the reuse window, silently reviving a session
 * the user just signed out of.
 */
export function resetRefreshCache(): void {
  inFlight = null
  lastResult = null
}
