/**
 * Rules for a public prospect claim.
 * The database functions in sql_migrations/20260929_website_prospect_claim.sql
 * apply the reservation. This module does not run a select-then-update.
 */
import { generatePreviewToken, hashPreviewToken } from '~/server/utils/website-preview-access'

export const CLAIM_REJECTION = 'Dieser Link ist ungültig oder abgelaufen.'
export const CLAIM_TOKEN_TTL_MS = 72 * 60 * 60 * 1000
export const CLAIM_RESERVATION_MS = 10 * 60 * 1000

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

export type ClaimBlock =
  | 'invalid'
  | 'expired'
  | 'claimed'
  | 'reserved'
  | 'missing_target'

export function claimTokenShapeOk(token: string): boolean {
  return TOKEN_PATTERN.test(token)
}

export function mintProspectClaimSecret(now = new Date()): { token: string; hash: string; expiresAt: string } {
  const token = generatePreviewToken()
  return {
    token,
    hash: hashPreviewToken(token),
    expiresAt: new Date(now.getTime() + CLAIM_TOKEN_TTL_MS).toISOString(),
  }
}

/**
 * Same predicates as reserve_website_prospect_claim.
 * A missing row, a bad hash, expiry, an existing claim, and an active reservation
 * all refuse the claim. Tenant and website must already exist on the prospect.
 */
export function prospectClaimBlockReason(input: {
  token: string
  hashMatches: boolean
  expiresAt?: string | null
  claimedAt?: string | null
  reservedUntil?: string | null
  tenantId?: string | null
  websiteId?: string | null
  now: number
}): ClaimBlock | null {
  if (!claimTokenShapeOk(input.token) || !input.hashMatches) return 'invalid'
  if (input.claimedAt) return 'claimed'
  if (!input.expiresAt) return 'expired'
  const expiresMs = new Date(input.expiresAt).getTime()
  if (Number.isNaN(expiresMs) || expiresMs <= input.now) return 'expired'
  if (input.reservedUntil) {
    const reservedMs = new Date(input.reservedUntil).getTime()
    if (!Number.isNaN(reservedMs) && reservedMs > input.now) return 'reserved'
  }
  if (!input.tenantId || !input.websiteId) return 'missing_target'
  return null
}
