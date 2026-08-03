/**
 * Hydrate the client Supabase session after a successful password/MFA login.
 *
 * Best practice (server + client dual auth):
 * 1. Server sets httpOnly cookies (XSS-safe) for /api/* cookie auth
 * 2. Client calls setSession() with the SAME tokens from the login response
 *    so supabase-js + the fetch interceptor Bearer header work immediately
 * 3. Do NOT force a refresh right after login (rotates the brand-new refresh token
 *    and races parallel post-login requests → 401 / logout loops)
 *
 * Always use this helper from every login UI path (/login, /[slug], etc.).
 */

import { logger } from '~/utils/logger'

export interface LoginSessionTokens {
  access_token?: string | null
  refresh_token?: string | null
}

export async function hydrateClientSessionAfterLogin(
  session?: LoginSessionTokens | null,
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // Clear stale post-expiry guards so a fresh login isn't treated as "already synced"
  try {
    sessionStorage.removeItem('cookie_sync_reload_at')
    sessionStorage.setItem('just_logged_in_at', Date.now().toString())
  } catch {
    // sessionStorage may be unavailable — non-fatal
  }

  if (!session?.access_token || !session?.refresh_token) {
    logger.warn('⚠️ hydrateClientSessionAfterLogin: missing tokens in login response')
    return false
  }

  try {
    const { getSupabase } = await import('~/utils/supabase')
    const { error } = await getSupabase().auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })

    if (error) {
      logger.warn('⚠️ Could not hydrate client Supabase session after login:', error.message)
      return false
    }

    logger.debug('✅ Client Supabase session hydrated after login')
    return true
  } catch (err: any) {
    logger.warn('⚠️ Session hydrate after login failed (non-fatal):', err?.message || err)
    return false
  }
}
