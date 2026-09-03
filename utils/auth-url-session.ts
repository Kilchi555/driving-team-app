/**
 * Invite/recovery URL hygiene helpers.
 * Pure functions so PKCE soft-fail + URL strip behavior is unit-tested
 * without mounting the Vue password pages.
 */

export const SENSITIVE_AUTH_QUERY_KEYS = [
  'code',
  'token_hash',
  'type',
  'access_token',
  'refresh_token',
  'error',
  'error_code',
  'error_description',
] as const

export type SessionFingerprint = {
  userId: string
  accessToken: string
} | null

/** Build pathname + search with auth secrets removed (hash always cleared). */
export function stripSensitiveAuthParams(href: string): string {
  const url = new URL(href)
  url.hash = ''
  for (const key of SENSITIVE_AUTH_QUERY_KEYS) {
    url.searchParams.delete(key)
  }
  const search = url.searchParams.toString()
  return url.pathname + (search ? `?${search}` : '')
}

export function sessionFingerprint(
  session: { user?: { id?: string } | null; access_token?: string } | null | undefined
): SessionFingerprint {
  const userId = session?.user?.id
  const accessToken = session?.access_token
  if (!userId || !accessToken) return null
  return { userId, accessToken }
}

/**
 * Soft-succeed an auth URL step only with hard evidence that THIS page load
 * consumed the invite/recovery credentials.
 *
 * Rules (fail closed otherwise — never accept a leftover login):
 * - no error → success (setSession / exchange / verifyOtp replaced the client session)
 * - hash/implicit (`expectedAccessToken` set) → success ONLY if session token matches
 * - PKCE/OTP → success ONLY if an existing session was replaced during the call
 *
 * Do not soft-ok a session that merely "appeared" — that can be a leftover revived
 * from cookies/refresh. Callers must throw on failure so getUser never binds the form.
 */
export function shouldSoftSucceedAuthUrlStep(options: {
  authError: unknown
  sessionBefore: SessionFingerprint
  sessionAfter: SessionFingerprint
  expectedAccessToken?: string | null
}): boolean {
  const {
    authError,
    sessionBefore,
    sessionAfter,
    expectedAccessToken = null,
  } = options

  if (!authError) return true
  if (!sessionAfter) return false

  // Hash/implicit: the URL token is authoritative — no other soft-ok paths.
  if (expectedAccessToken != null && expectedAccessToken !== '') {
    return sessionAfter.accessToken === expectedAccessToken
  }

  // PKCE/OTP: require a real replace of an existing client session.
  if (!sessionBefore) return false

  return (
    sessionBefore.userId !== sessionAfter.userId ||
    sessionBefore.accessToken !== sessionAfter.accessToken
  )
}

/**
 * Clear server-side leftover auth before consuming invite/recovery URL credentials.
 *
 * Intentionally does NOT call supabase.auth.signOut:
 * - `scope: 'global'` would revoke refresh tokens on other devices
 * - any signOut clears the PKCE code-verifier and breaks exchangeCodeForSession
 *
 * A successful setSession / exchange / verifyOtp replaces the client session.
 * A failed consume must throw so the form never binds via getUser to a leftover.
 */
export async function clearServerAuthBeforeUrlConsume(): Promise<void> {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Continue — URL consume still proceeds with client tokens
  }

  try {
    const { resetRefreshCache } = await import('~/utils/client-session-refresh')
    resetRefreshCache()
  } catch {
    // non-fatal
  }
}

/** @deprecated Use clearServerAuthBeforeUrlConsume — kept name for call-site clarity. */
export async function clearLeftoverAuthBeforeUrlConsume(): Promise<void> {
  await clearServerAuthBeforeUrlConsume()
}
