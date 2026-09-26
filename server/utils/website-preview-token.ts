/**
 * Opaque website-preview bearer tokens.
 * Crypto only — no tenant, user, or billing logic.
 *
 * Hash choice: SHA-256 of the raw token (same pattern as token-refresh
 * hashToken). HMAC is used elsewhere for *derived* tokens that need a
 * server secret (registration-token, idle-stop, account-switch). These
 * preview tokens are unguessable random bytes; SHA-256 is the existing
 * Simy pattern for hashing opaque secrets at rest.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const WEBSITE_PREVIEW_TOKEN_BYTES = 32
export const WEBSITE_PREVIEW_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const WEBSITE_PREVIEW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

const TRIVIAL_BYPASS = new Set(['1', 'true', 'yes', 'on', 'preview'])

export type WebsitePreviewTokenRecord = {
  preview_token_hash: string | null
  preview_expires_at: string | Date | null
  preview_revoked_at: string | Date | null
}

export type WebsitePreviewVerifyReason =
  | 'ok'
  | 'missing'
  | 'malformed'
  | 'mismatch'
  | 'expired'
  | 'revoked'

export type WebsitePreviewVerifyResult =
  | { ok: true; reason: 'ok' }
  | { ok: false; reason: Exclude<WebsitePreviewVerifyReason, 'ok'> }

export function mintWebsitePreviewToken(now = new Date()): {
  token: string
  hash: string
  expiresAt: Date
} {
  const token = randomBytes(WEBSITE_PREVIEW_TOKEN_BYTES).toString('base64url')
  return {
    token,
    hash: hashWebsitePreviewToken(token),
    expiresAt: new Date(now.getTime() + WEBSITE_PREVIEW_TOKEN_TTL_MS),
  }
}

export function hashWebsitePreviewToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function isTrivialWebsitePreviewBypass(value: string): boolean {
  return TRIVIAL_BYPASS.has(value.trim().toLowerCase())
}

export function isWellFormedWebsitePreviewToken(token: string): boolean {
  if (!token || isTrivialWebsitePreviewBypass(token)) return false
  return WEBSITE_PREVIEW_TOKEN_PATTERN.test(token)
}

export function parseWebsitePreviewToken(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value == null || typeof value === 'boolean') return null
  const token = String(value).trim()
  if (!isWellFormedWebsitePreviewToken(token)) return null
  return token
}

export function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function verifyWebsitePreviewToken(
  token: string | null | undefined,
  record: WebsitePreviewTokenRecord | null | undefined,
  now = new Date(),
): WebsitePreviewVerifyResult {
  if (!token) return { ok: false, reason: 'missing' }
  if (!isWellFormedWebsitePreviewToken(token)) return { ok: false, reason: 'malformed' }
  if (!record?.preview_token_hash) return { ok: false, reason: 'mismatch' }
  if (record.preview_revoked_at) return { ok: false, reason: 'revoked' }

  const expiresAt = record.preview_expires_at ? new Date(record.preview_expires_at) : null
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' }
  }

  const presented = hashWebsitePreviewToken(token)
  if (!hashesEqual(presented, record.preview_token_hash)) {
    return { ok: false, reason: 'mismatch' }
  }

  return { ok: true, reason: 'ok' }
}

export function mintedPreviewFields(minted: { hash: string; expiresAt: Date }) {
  return {
    preview_token_hash: minted.hash,
    preview_expires_at: minted.expiresAt.toISOString(),
    preview_revoked_at: null as string | null,
    preview_token: null as string | null,
  }
}

export function revokedPreviewFields(now = new Date()) {
  return {
    preview_revoked_at: now.toISOString(),
  }
}
