/**
 * Short-lived HMAC tokens that bind a registration session to a tenant_id.
 *
 * After email verification succeeds, the server signs a token that encodes the
 * tenant_id + creation timestamp. Subsequent steps that operate on the
 * freshly-verified tenant (create-admin, rollback-registration,
 * invite-staff-batch) must present this token.
 *
 * Requires NUXT_REGISTRATION_TOKEN_SECRET (min length). There is no insecure
 * fallback — missing/empty/invalid secrets fail closed.
 */

import { createHmac, timingSafeEqual } from 'crypto'

const EXPIRY_MS = 30 * 60 * 1000 // 30 minutes
/** Minimum entropy for the HMAC secret (bytes of string length). */
export const REGISTRATION_TOKEN_SECRET_MIN_LENGTH = 32

export class RegistrationTokenSecretError extends Error {
  constructor(message = 'NUXT_REGISTRATION_TOKEN_SECRET is not configured') {
    super(message)
    this.name = 'RegistrationTokenSecretError'
  }
}

/**
 * Resolve the HMAC secret or throw. Never returns a hardcoded default.
 * Does not log or return the secret value.
 */
export function getRegistrationTokenSecret(): string {
  const raw = process.env.NUXT_REGISTRATION_TOKEN_SECRET
  if (typeof raw !== 'string') {
    throw new RegistrationTokenSecretError()
  }
  const s = raw.trim()
  if (s.length < REGISTRATION_TOKEN_SECRET_MIN_LENGTH) {
    throw new RegistrationTokenSecretError(
      'NUXT_REGISTRATION_TOKEN_SECRET is missing or too short',
    )
  }
  return s
}

export function isRegistrationTokenSecretConfigured(): boolean {
  try {
    getRegistrationTokenSecret()
    return true
  } catch {
    return false
  }
}

export function generateRegistrationToken(tenantId: string): string {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId required')
  }
  const secret = getRegistrationTokenSecret()
  const timestamp = Date.now().toString()
  const payload = `${tenantId}:${timestamp}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/**
 * Verify a registration HMAC. Fail-closed: missing/invalid secret → false
 * (never throws secrets; never uses a fallback default).
 */
export function verifyRegistrationToken(token: string | undefined, tenantId: string): boolean {
  try {
    if (!token || typeof token !== 'string' || !tenantId) return false
    const secret = getRegistrationTokenSecret()

    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    // Expected format: "<tenantId>:<timestamp>:<hmac-hex>"
    const lastColon = decoded.lastIndexOf(':')
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1)
    if (lastColon < 0 || secondLastColon < 0) return false

    const tokenTenantId = decoded.slice(0, secondLastColon)
    const timestamp = decoded.slice(secondLastColon + 1, lastColon)
    const sig = decoded.slice(lastColon + 1)

    if (tokenTenantId !== tenantId) return false

    const ts = parseInt(timestamp, 10)
    if (!Number.isFinite(ts)) return false
    const age = Date.now() - ts
    if (age < 0 || age > EXPIRY_MS) return false

    const expectedSig = createHmac('sha256', secret)
      .update(`${tokenTenantId}:${timestamp}`)
      .digest('hex')

    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    // Including RegistrationTokenSecretError — fail closed, no secret leakage.
    return false
  }
}
