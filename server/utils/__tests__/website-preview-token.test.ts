import { describe, expect, it } from 'vitest'
import {
  hashWebsitePreviewToken,
  isTrivialWebsitePreviewBypass,
  isWellFormedWebsitePreviewToken,
  mintedPreviewFields,
  mintWebsitePreviewToken,
  parseWebsitePreviewToken,
  verifyWebsitePreviewToken,
  WEBSITE_PREVIEW_TOKEN_BYTES,
} from '../website-preview-token'

describe('website preview token utility', () => {
  it('mints unpredictable base64url secrets, not a UUID-only secret', () => {
    const a = mintWebsitePreviewToken()
    const b = mintWebsitePreviewToken()
    expect(a.token).not.toBe(b.token)
    expect(a.hash).not.toBe(b.hash)
    expect(a.token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(a.token).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(a.token.length).toBeGreaterThanOrEqual(Math.ceil((WEBSITE_PREVIEW_TOKEN_BYTES * 8) / 6) - 1)
    expect(a.hash).toBe(hashWebsitePreviewToken(a.token))
    expect(a.hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('hashes consistently and does not store the plaintext token in mint fields', () => {
    const minted = mintWebsitePreviewToken()
    expect(hashWebsitePreviewToken(minted.token)).toBe(minted.hash)
    expect(hashWebsitePreviewToken(minted.token)).toBe(hashWebsitePreviewToken(minted.token))
    expect(mintedPreviewFields(minted).preview_token).toBeNull()
    expect(mintedPreviewFields(minted).preview_token_hash).toBe(minted.hash)
    expect(mintedPreviewFields(minted).preview_revoked_at).toBeNull()
  })

  it('accepts the correct token and rejects the wrong token', () => {
    const minted = mintWebsitePreviewToken()
    const record = {
      preview_token_hash: minted.hash,
      preview_expires_at: minted.expiresAt,
      preview_revoked_at: null,
    }
    expect(verifyWebsitePreviewToken(minted.token, record).ok).toBe(true)
    expect(verifyWebsitePreviewToken(mintWebsitePreviewToken().token, record).reason).toBe('mismatch')
  })

  it('rejects expired, revoked, missing, and malformed tokens', () => {
    const minted = mintWebsitePreviewToken()
    const base = {
      preview_token_hash: minted.hash,
      preview_expires_at: minted.expiresAt,
      preview_revoked_at: null as string | null,
    }
    expect(verifyWebsitePreviewToken(null, base).reason).toBe('missing')
    expect(verifyWebsitePreviewToken('1', base).reason).toBe('malformed')
    expect(verifyWebsitePreviewToken('true', base).reason).toBe('malformed')
    expect(verifyWebsitePreviewToken('short', base).reason).toBe('malformed')
    expect(
      verifyWebsitePreviewToken(minted.token, { ...base, preview_expires_at: new Date(Date.now() - 1000) }).reason,
    ).toBe('expired')
    expect(
      verifyWebsitePreviewToken(minted.token, { ...base, preview_revoked_at: new Date().toISOString() }).reason,
    ).toBe('revoked')
    expect(verifyWebsitePreviewToken(minted.token, { ...base, preview_token_hash: null }).reason).toBe('mismatch')
  })

  it('treats preview=1 and aliases as trivial bypass values, never as secrets', () => {
    expect(isTrivialWebsitePreviewBypass('1')).toBe(true)
    expect(isTrivialWebsitePreviewBypass('true')).toBe(true)
    expect(isWellFormedWebsitePreviewToken('1')).toBe(false)
    expect(parseWebsitePreviewToken('1')).toBeNull()
    expect(parseWebsitePreviewToken(true)).toBeNull()
    expect(parseWebsitePreviewToken(mintWebsitePreviewToken().token)).toBeTruthy()
  })

  it('invalidates the previous token when a new one is minted', () => {
    const first = mintWebsitePreviewToken()
    const second = mintWebsitePreviewToken()
    const record = {
      preview_token_hash: second.hash,
      preview_expires_at: second.expiresAt,
      preview_revoked_at: null,
    }
    expect(verifyWebsitePreviewToken(first.token, record).ok).toBe(false)
    expect(verifyWebsitePreviewToken(second.token, record).ok).toBe(true)
  })
})
