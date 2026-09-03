import { describe, expect, it } from 'vitest'
import {
  isLikelyAlreadyExchangedAuthError,
  isRecentlyIssuedAccessToken,
  sessionFingerprint,
  shouldSoftSucceedAuthUrlStep,
  stripSensitiveAuthParams,
} from '../auth-url-session'

function makeJwt(iat: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat, sub: 'user-1' })).toString('base64url')
  return `${header}.${payload}.sig`
}

describe('stripSensitiveAuthParams', () => {
  it('clears hash tokens and keeps non-sensitive query', () => {
    const cleaned = stripSensitiveAuthParams(
      'https://app.simy.ch/login/set-password?tenant=acme#access_token=aaa&refresh_token=bbb&type=invite'
    )
    expect(cleaned).toBe('/login/set-password?tenant=acme')
  })

  it('removes PKCE and token_hash query params', () => {
    const cleaned = stripSensitiveAuthParams(
      'https://app.simy.ch/login/set-password?code=abc&token_hash=xyz&type=invite&next=/app'
    )
    expect(cleaned).toBe('/login/set-password?next=%2Fapp')
  })
})

describe('shouldSoftSucceedAuthUrlStep', () => {
  const nowSec = 1_700_000_000
  const freshToken = makeJwt(nowSec - 10)
  const staleToken = makeJwt(nowSec - 3600)

  it('succeeds when there was no error', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: null,
        sessionBefore: null,
        sessionAfter: null,
        nowSec,
      })
    ).toBe(true)
  })

  it('fail-closes when exchange failed and no session', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: null,
        sessionAfter: null,
        nowSec,
      })
    ).toBe(false)
  })

  it('soft-succeeds when session appeared during the call', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: null,
        sessionAfter: { userId: 'b', accessToken: freshToken },
        nowSec,
      })
    ).toBe(true)
  })

  it('soft-succeeds when session was replaced during the call', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: { userId: 'a', accessToken: staleToken },
        sessionAfter: { userId: 'b', accessToken: freshToken },
        nowSec,
      })
    ).toBe(true)
  })

  it('fail-closes leftover same session that is not a fresh PKCE race', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: { userId: 'a', accessToken: staleToken },
        sessionAfter: { userId: 'a', accessToken: staleToken },
        nowSec,
      })
    ).toBe(false)
  })

  it('soft-succeeds same session only when already-exchanged error + fresh token', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request: both auth code and code verifier should be non-empty'),
        sessionBefore: { userId: 'b', accessToken: freshToken },
        sessionAfter: { userId: 'b', accessToken: freshToken },
        nowSec,
      })
    ).toBe(true)
  })

  it('accepts hash flow when session token matches URL token', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('session exists'),
        sessionBefore: { userId: 'a', accessToken: staleToken },
        sessionAfter: { userId: 'b', accessToken: 'hash-access-token' },
        expectedAccessToken: 'hash-access-token',
        nowSec,
      })
    ).toBe(true)
  })

  it('rejects hash soft-ok when leftover session does not match URL token', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('session exists'),
        sessionBefore: { userId: 'a', accessToken: staleToken },
        sessionAfter: { userId: 'a', accessToken: staleToken },
        expectedAccessToken: 'hash-access-token',
        nowSec,
      })
    ).toBe(false)
  })
})

describe('helpers', () => {
  it('sessionFingerprint requires user + token', () => {
    expect(sessionFingerprint(null)).toBeNull()
    expect(sessionFingerprint({ user: { id: 'u' }, access_token: 't' })).toEqual({
      userId: 'u',
      accessToken: 't',
    })
  })

  it('detects already-exchanged style errors', () => {
    expect(isLikelyAlreadyExchangedAuthError({ message: 'code verifier missing' })).toBe(true)
    expect(isLikelyAlreadyExchangedAuthError({ message: 'network down' })).toBe(false)
  })

  it('detects recent JWT iat', () => {
    const now = 1_700_000_000
    expect(isRecentlyIssuedAccessToken(makeJwt(now - 5), 120, now)).toBe(true)
    expect(isRecentlyIssuedAccessToken(makeJwt(now - 500), 120, now)).toBe(false)
  })
})
