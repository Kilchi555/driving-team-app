/**
 * Short-lived HMAC grant for the public registration document upload.
 *
 * Binds userId + tenantId + purpose + expiry. The payload is readable by the
 * client; integrity comes from the server-only HMAC. This is not a one-time
 * token: the registration page uploads one file per category with the same
 * grant, and there is no persisted redemption store. Replay is limited by TTL.
 *
 * short-lived signed grant, replay-limited by TTL, not strict one-time
 *
 * Pattern follows server/utils/registration-token.ts (HMAC-SHA256 +
 * timingSafeEqual) with a distinct domain so tenant-registration tokens and
 * account-switch cookies cannot be replayed here.
 */

import { createHmac, timingSafeEqual } from 'crypto'

export const REGISTRATION_UPLOAD_GRANT_PURPOSE = 'document-upload'
export const REGISTRATION_UPLOAD_GRANT_TTL_MS = 10 * 60 * 1000

const DOMAIN = 'registration-upload-grant.v1'
const CLOCK_SKEW_MS = 30 * 1000

export type RegistrationUploadGrantClaims = {
  userId: string
  tenantId: string
  purpose: string
  exp: number
}

export type RegistrationUploadGrantResult =
  | { status: 'valid'; claims: RegistrationUploadGrantClaims }
  | { status: 'expired' }
  | { status: 'invalid' }

function grantSecret(): string | null {
  const dedicated = process.env.NUXT_REGISTRATION_TOKEN_SECRET
  if (dedicated && dedicated.length >= 32) return dedicated
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (service && service.length >= 32) return service
  return null
}

function signBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(`${DOMAIN}:${body}`).digest('base64url')
}

function isClaimString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

export function signRegistrationUploadGrant(claims: RegistrationUploadGrantClaims): string | null {
  const secret = grantSecret()
  if (!secret) return null
  if (!isClaimString(claims.userId) || !isClaimString(claims.tenantId) || !isClaimString(claims.purpose)) {
    return null
  }
  if (!Number.isFinite(claims.exp)) return null

  const body = Buffer.from(JSON.stringify({
    userId: claims.userId,
    tenantId: claims.tenantId,
    purpose: claims.purpose,
    exp: claims.exp,
  }), 'utf8').toString('base64url')
  return `${body}.${signBody(body, secret)}`
}

export function createRegistrationUploadGrant(input: {
  userId: string
  tenantId: string
  now?: number
}): string | null {
  const now = input.now ?? Date.now()
  return signRegistrationUploadGrant({
    userId: input.userId,
    tenantId: input.tenantId,
    purpose: REGISTRATION_UPLOAD_GRANT_PURPOSE,
    exp: now + REGISTRATION_UPLOAD_GRANT_TTL_MS,
  })
}

export function verifyRegistrationUploadGrant(
  token: string | null | undefined,
  now = Date.now(),
): RegistrationUploadGrantResult {
  try {
    const secret = grantSecret()
    if (!secret || !token || typeof token !== 'string') return { status: 'invalid' }

    const dot = token.indexOf('.')
    if (dot < 1 || dot !== token.lastIndexOf('.')) return { status: 'invalid' }
    const body = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    if (!body || !sig) return { status: 'invalid' }

    const expected = signBody(body, secret)
    const actualBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
      return { status: 'invalid' }
    }

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<RegistrationUploadGrantClaims>
    if (!isClaimString(parsed.userId) || !isClaimString(parsed.tenantId) || !isClaimString(parsed.purpose)) {
      return { status: 'invalid' }
    }
    if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) return { status: 'invalid' }
    if (parsed.exp > now + REGISTRATION_UPLOAD_GRANT_TTL_MS + CLOCK_SKEW_MS) return { status: 'invalid' }
    if (parsed.exp <= now) return { status: 'expired' }

    return {
      status: 'valid',
      claims: {
        userId: parsed.userId,
        tenantId: parsed.tenantId,
        purpose: parsed.purpose,
        exp: parsed.exp,
      },
    }
  } catch {
    return { status: 'invalid' }
  }
}
