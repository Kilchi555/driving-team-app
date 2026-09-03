import { describe, expect, it } from 'vitest'
import {
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
    expect(shouldSoftSucceedAuthUrlStep(null, false)).toBe(true)
  })

  it('soft-succeeds when exchange failed but session already exists', () => {
    expect(shouldSoftSucceedAuthUrlStep(new Error('invalid request'), true)).toBe(true)
  })

  it('fail-closes when exchange failed and no session', () => {
    expect(shouldSoftSucceedAuthUrlStep(new Error('invalid request'), false)).toBe(false)
  })
})
