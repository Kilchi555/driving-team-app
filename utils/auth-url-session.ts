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
 * - no error → success
 * - hash/implicit (`expectedAccessToken` set) → success ONLY if session token matches
 * - PKCE/OTP → success ONLY if a session appeared or was replaced during the call
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

  // PKCE/OTP: only a session that appeared or changed during this call counts.
  if (!sessionBefore) return true

  return (
    sessionBefore.userId !== sessionAfter.userId ||
    sessionBefore.accessToken !== sessionAfter.accessToken
  )
}
