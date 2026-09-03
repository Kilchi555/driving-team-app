import { describe, expect, it } from 'vitest'
import {
  sessionFingerprint,
  shouldSoftSucceedAuthUrlStep,
  stripSensitiveAuthParams,
} from '../auth-url-session'

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
  it('succeeds when there was no error', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: null,
        sessionBefore: null,
        sessionAfter: null,
      })
    ).toBe(true)
  })

  it('fail-closes when exchange failed and no session', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: null,
        sessionAfter: null,
      })
    ).toBe(false)
  })

  it('soft-succeeds when session appeared during the call (PKCE race)', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: null,
        sessionAfter: { userId: 'b', accessToken: 'token-b' },
      })
    ).toBe(true)
  })

  it('soft-succeeds when session was replaced during the call', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request'),
        sessionBefore: { userId: 'a', accessToken: 'token-a' },
        sessionAfter: { userId: 'b', accessToken: 'token-b' },
      })
    ).toBe(true)
  })

  it('fail-closes leftover same session even with fresh-looking invalid-request error', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('invalid request: both auth code and code verifier should be non-empty'),
        sessionBefore: { userId: 'a', accessToken: 'fresh-looking-token' },
        sessionAfter: { userId: 'a', accessToken: 'fresh-looking-token' },
      })
    ).toBe(false)
  })

  it('accepts hash flow only when session token matches URL token', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('session exists'),
        sessionBefore: { userId: 'a', accessToken: 'leftover' },
        sessionAfter: { userId: 'b', accessToken: 'hash-access-token' },
        expectedAccessToken: 'hash-access-token',
      })
    ).toBe(true)
  })

  it('rejects hash soft-ok when leftover session does not match URL token', () => {
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('session exists'),
        sessionBefore: { userId: 'a', accessToken: 'leftover' },
        sessionAfter: { userId: 'a', accessToken: 'leftover-refreshed' },
        expectedAccessToken: 'hash-access-token',
      })
    ).toBe(false)
  })

  it('does not fall through to PKCE rules when expectedAccessToken is set but mismatches', () => {
    // Session "appeared" during call, but hash token must still match
    expect(
      shouldSoftSucceedAuthUrlStep({
        authError: new Error('bad hash'),
        sessionBefore: null,
        sessionAfter: { userId: 'a', accessToken: 'leftover' },
        expectedAccessToken: 'hash-access-token',
      })
    ).toBe(false)
  })
})

describe('sessionFingerprint', () => {
  it('requires user + token', () => {
    expect(sessionFingerprint(null)).toBeNull()
    expect(sessionFingerprint({ user: { id: 'u' }, access_token: 't' })).toEqual({
      userId: 'u',
      accessToken: 't',
    })
  })
})
