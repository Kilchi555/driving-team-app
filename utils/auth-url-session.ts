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

/** True when access token JWT `iat` is within maxAgeSec (fresh invite/recovery exchange). */
export function isRecentlyIssuedAccessToken(
  accessToken: string | null | undefined,
  maxAgeSec = 120,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!accessToken) return false
  try {
    const payloadPart = accessToken.split('.')[1]
    if (!payloadPart) return false
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { iat?: number }
    if (typeof payload.iat !== 'number') return false
    return nowSec - payload.iat <= maxAgeSec && nowSec - payload.iat >= -30
  } catch {
    return false
  }
}

/** Errors typical of a second PKCE/OTP consume after the module already succeeded. */
export function isLikelyAlreadyExchangedAuthError(error: unknown): boolean {
  const err = error as { message?: string; code?: string } | null
  const msg = String(err?.message || error || '').toLowerCase()
  const code = String(err?.code || '').toLowerCase()
  return (
    code === 'flow_state_not_found' ||
    code === 'validation_failed' ||
    msg.includes('code verifier') ||
    msg.includes('flow state') ||
    msg.includes('both auth code and code verifier') ||
    msg.includes('auth code') ||
    msg.includes('already been used') ||
    msg.includes('invalid request')
  )
}

/**
 * Soft-succeed an auth URL step only when evidence says THIS page load consumed
 * the invite/recovery credentials — never merely because some leftover session exists.
 *
 * Succeed when:
 * - no error
 * - hash/implicit: session access_token matches the URL token we tried to install
 * - session appeared or was replaced during the call (concurrent module race)
 * - PKCE/OTP: exchange error looks like "already used" AND after-session is freshly issued
 */
export function shouldSoftSucceedAuthUrlStep(options: {
  authError: unknown
  sessionBefore: SessionFingerprint
  sessionAfter: SessionFingerprint
  expectedAccessToken?: string | null
  nowSec?: number
}): boolean {
  const {
    authError,
    sessionBefore,
    sessionAfter,
    expectedAccessToken = null,
    nowSec = Math.floor(Date.now() / 1000),
  } = options

  if (!authError) return true
  if (!sessionAfter) return false

  if (expectedAccessToken && sessionAfter.accessToken === expectedAccessToken) {
    return true
  }

  if (!sessionBefore) {
    // Session appeared during the call — treat as successful race with the module.
    return true
  }

  if (
    sessionBefore.userId !== sessionAfter.userId ||
    sessionBefore.accessToken !== sessionAfter.accessToken
  ) {
    return true
  }

  // Same session as before: only allow soft-ok for a fresh PKCE/OTP race, never a leftover login.
  return (
    isLikelyAlreadyExchangedAuthError(authError) &&
    isRecentlyIssuedAccessToken(sessionAfter.accessToken, 120, nowSec)
  )
}
