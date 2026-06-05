/**
 * Short-lived HMAC tokens that bind a registration session to a tenant_id.
 *
 * After `POST /api/tenants/register` succeeds, the server signs a token that
 * encodes the tenant_id + creation timestamp. Subsequent steps that operate on
 * the freshly-created tenant (create-admin, rollback-registration) must present
 * this token to prove they were initiated by the same registration flow.
 *
 * This prevents an attacker who guesses or leaks a tenant UUID from hijacking
 * the half-finished registration (C-CA1, H-RB1 in the security audit).
 */

import { createHmac, timingSafeEqual } from 'crypto'

const EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

function getSecret(): string {
  const s = process.env.NUXT_REGISTRATION_TOKEN_SECRET
  if (!s) {
    // Warn loudly in dev; in production this should always be set.
    console.warn('⚠️  NUXT_REGISTRATION_TOKEN_SECRET is not set – using insecure fallback!')
    return 'insecure-dev-secret-change-in-production'
  }
  return s
}

export function generateRegistrationToken(tenantId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${tenantId}:${timestamp}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyRegistrationToken(token: string | undefined, tenantId: string): boolean {
  try {
    if (!token || typeof token !== 'string') return false
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    // Expected format: "<tenantId>:<timestamp>:<hmac-hex>"
    const lastColon = decoded.lastIndexOf(':')
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1)
    if (lastColon < 0 || secondLastColon < 0) return false

    const tokenTenantId = decoded.slice(0, secondLastColon)
    const timestamp = decoded.slice(secondLastColon + 1, lastColon)
    const sig = decoded.slice(lastColon + 1)

    if (tokenTenantId !== tenantId) return false

    const age = Date.now() - parseInt(timestamp, 10)
    if (isNaN(age) || age < 0 || age > EXPIRY_MS) return false

    const expectedSig = createHmac('sha256', getSecret())
      .update(`${tokenTenantId}:${timestamp}`)
      .digest('hex')

    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}
