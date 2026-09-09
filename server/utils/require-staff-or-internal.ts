import { createError, getHeader, type H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'
import { requireAdminProfile } from '~/server/utils/auth'

export const STAFF_ADMIN_ROLES = ['admin', 'staff', 'super_admin', 'tenant_admin'] as const

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Resolve the shared internal API secret used for server→server calls. */
export function getInternalApiSecret(): string | null {
  const secret = (
    process.env.CRON_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    process.env.NUXT_INTERNAL_API_SECRET ||
    ''
  ).trim()
  return secret || null
}

export function isInternalSecretRequest(event: H3Event): boolean {
  const expected = getInternalApiSecret()
  if (!expected) return false
  // x-vercel-cron is not an internal credential.
  const provided =
    getHeader(event, 'x-internal-secret') || getHeader(event, 'x-internal-api-secret')
  return !!provided && secretsEqual(provided, expected)
}

/** Headers to forward on trusted server-side $fetch calls. */
export function internalSecretHeaders(): Record<string, string> {
  const secret = getInternalApiSecret()
  return secret ? { 'x-internal-secret': secret } : {}
}

/**
 * Allow either:
 * - trusted internal callers (x-internal-secret), or
 * - authenticated staff/admin via requireAdminProfile
 */
export async function requireStaffOrInternal(
  event: H3Event,
  allowedRoles: string[] = [...STAFF_ADMIN_ROLES]
) {
  if (isInternalSecretRequest(event)) {
    return { mode: 'internal' as const, profile: null }
  }

  const profile = await requireAdminProfile(event, allowedRoles)
  return { mode: 'staff' as const, profile }
}

export function assertInternalSecret(event: H3Event) {
  if (!isInternalSecretRequest(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized – internal secret required'
    })
  }
}
