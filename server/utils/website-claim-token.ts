import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const WEBSITE_CLAIM_TOKEN_BYTES = 32
export const WEBSITE_CLAIM_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const WEBSITE_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

export type WebsiteClaimTokenRecord = {
  claim_token_hash?: string | null
  claim_expires_at?: string | null
  claim_revoked_at?: string | null
}

export type WebsiteClaimVerifyReason =
  | 'ok'
  | 'missing'
  | 'malformed'
  | 'mismatch'
  | 'expired'
  | 'revoked'

export type WebsiteClaimVerifyResult =
  | { ok: true; reason: 'ok' }
  | { ok: false; reason: Exclude<WebsiteClaimVerifyReason, 'ok'> }

export function mintWebsiteClaimToken(now = new Date()) {
  const token = randomBytes(WEBSITE_CLAIM_TOKEN_BYTES).toString('base64url')
  return {
    token,
    hash: hashWebsiteClaimToken(token),
    expiresAt: new Date(now.getTime() + WEBSITE_CLAIM_TOKEN_TTL_MS),
  }
}

export function hashWebsiteClaimToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function isWellFormedWebsiteClaimToken(token: string): boolean {
  return WEBSITE_CLAIM_TOKEN_PATTERN.test(token)
}

export function parseWebsiteClaimToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const token = raw.trim()
  if (!isWellFormedWebsiteClaimToken(token)) return null
  return token
}

export function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function verifyWebsiteClaimToken(
  token: string | null | undefined,
  record: WebsiteClaimTokenRecord | null | undefined,
  now = new Date(),
): WebsiteClaimVerifyResult {
  if (!token) return { ok: false, reason: 'missing' }
  if (!isWellFormedWebsiteClaimToken(token)) return { ok: false, reason: 'malformed' }
  if (!record?.claim_token_hash) return { ok: false, reason: 'missing' }
  if (!hashesEqual(hashWebsiteClaimToken(token), record.claim_token_hash)) {
    return { ok: false, reason: 'mismatch' }
  }
  if (record.claim_revoked_at) return { ok: false, reason: 'revoked' }
  if (record.claim_expires_at && new Date(record.claim_expires_at).getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, reason: 'ok' }
}

export function mintedClaimFields(minted: { hash: string; expiresAt: Date }) {
  return {
    claim_token_hash: minted.hash,
    claim_expires_at: minted.expiresAt.toISOString(),
    claim_revoked_at: null as string | null,
  }
}

export function revokedClaimFields(now = new Date()) {
  return { claim_revoked_at: now.toISOString() }
}
