/**
 * F-02 follow-up: invite/recovery URL hygiene helpers.
 * Pure functions extracted so PKCE soft-fail + URL strip behavior is unit-tested
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

/**
 * Whether an auth URL-step error should be treated as success because a session
 * already exists (e.g. second exchangeCodeForSession after module auto-detect).
 */
export function shouldSoftSucceedAuthUrlStep(
  authError: unknown,
  hasSession: boolean
): boolean {
  if (!authError) return true
  return hasSession
}
