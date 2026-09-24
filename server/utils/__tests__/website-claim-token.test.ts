import { describe, expect, it } from 'vitest'
import {
  hashWebsiteClaimToken,
  isWellFormedWebsiteClaimToken,
  mintedClaimFields,
  mintWebsiteClaimToken,
  parseWebsiteClaimToken,
  verifyWebsiteClaimToken,
} from '../website-claim-token'

describe('website claim token utility', () => {
  it('mints unpredictable secrets and never stores plaintext in mint fields', () => {
    const a = mintWebsiteClaimToken()
    const b = mintWebsiteClaimToken()
    expect(a.token).not.toBe(b.token)
    expect(a.hash).toBe(hashWebsiteClaimToken(a.token))
    expect(mintedClaimFields(a)).not.toHaveProperty('claim_token')
    expect(mintedClaimFields(a).claim_token_hash).toBe(a.hash)
    expect(JSON.stringify(mintedClaimFields(a))).not.toContain(a.token)
  })

  it('accepts the correct token and rejects the wrong token', () => {
    const minted = mintWebsiteClaimToken()
    const record = mintedClaimFields(minted)
    expect(verifyWebsiteClaimToken(minted.token, record).ok).toBe(true)
    expect(verifyWebsiteClaimToken(minted.token.slice(0, -2) + 'xx', record).ok).toBe(false)
  })

  it('rejects expired, revoked, missing, and malformed tokens', () => {
    const minted = mintWebsiteClaimToken(new Date('2026-01-01T00:00:00.000Z'))
    const record = mintedClaimFields(minted)
    expect(
      verifyWebsiteClaimToken(minted.token, record, new Date('2026-03-01T00:00:00.000Z')).reason,
    ).toBe('expired')
    expect(verifyWebsiteClaimToken(minted.token, { ...record, claim_revoked_at: '2026-01-02T00:00:00.000Z' }).reason).toBe('revoked')
    expect(verifyWebsiteClaimToken(null, record).reason).toBe('missing')
    expect(verifyWebsiteClaimToken('1', record).reason).toBe('malformed')
  })

  it('does not treat preview=1 aliases as claim tokens', () => {
    expect(parseWebsiteClaimToken('1')).toBeNull()
    expect(parseWebsiteClaimToken('preview')).toBeNull()
    expect(isWellFormedWebsiteClaimToken('true')).toBe(false)
  })
})
