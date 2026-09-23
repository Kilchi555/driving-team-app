/**
 * Signed context for the anonymous public booking hop.
 * The server mints this after resolving tenants.slug → tenants.id.
 * marketing_touches.tenant_id may come only from a verified token.
 * Callers must not fall back to a client tenant id or MARKETING_TENANT_ID.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export const BOOKING_CONTEXT_PURPOSE = 'booking-context'
export const BOOKING_CONTEXT_VERSION = 'v1'
export const BOOKING_CONTEXT_TTL_MS = 15 * 60 * 1000
const MIN_SECRET_LENGTH = 16
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLOCK_SKEW_MS = 60_000

export interface VerifiedBookingContext {
  tenantId: string
  slug: string
  issuedAt: number
  expiresAt: number
}

interface BookingContextPayload {
  v: 1
  purpose: typeof BOOKING_CONTEXT_PURPOSE
  tenant_id: string
  slug: string
  iat: number
  exp: number
}

export function readBookingContextSecret(configured?: unknown): string {
  if (typeof configured === 'string' && configured.trim()) return configured.trim()
  return String(process.env.NUXT_BOOKING_CONTEXT_SECRET || '').trim()
}

function usableSecret(secret: string): string | null {
  const trimmed = secret.trim()
  if (trimmed.length < MIN_SECRET_LENGTH) return null
  return trimmed
}

function sign(secret: string, material: string): string {
  return createHmac('sha256', secret).update(material).digest('base64url')
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(actualBuf, expectedBuf)
}

function validSlug(slug: string): boolean {
  const trimmed = slug.trim()
  return trimmed.length > 0 && trimmed.length <= 200 && trimmed === slug
}

export function createBookingContext(input: {
  tenantId: string
  slug: string
  secret: string
  now?: number
}): string | null {
  const secret = usableSecret(input.secret)
  if (!secret) return null
  if (!UUID_RE.test(input.tenantId)) return null
  if (!validSlug(input.slug)) return null

  const iat = input.now ?? Date.now()
  if (!Number.isFinite(iat)) return null
  const payload: BookingContextPayload = {
    v: 1,
    purpose: BOOKING_CONTEXT_PURPOSE,
    tenant_id: input.tenantId,
    slug: input.slug,
    iat,
    exp: iat + BOOKING_CONTEXT_TTL_MS,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const material = `${BOOKING_CONTEXT_PURPOSE}.${BOOKING_CONTEXT_VERSION}.${encoded}`
  return `${material}.${sign(secret, material)}`
}

export function verifyBookingContext(
  token: string | null | undefined,
  options: { secret: string; now?: number },
): VerifiedBookingContext | null {
  const secret = usableSecret(options.secret)
  if (!secret || typeof token !== 'string' || !token) return null

  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [purpose, version, encoded, signature] = parts
  if (purpose !== BOOKING_CONTEXT_PURPOSE || version !== BOOKING_CONTEXT_VERSION) return null
  if (!encoded || !signature) return null

  const material = `${purpose}.${version}.${encoded}`
  if (!signaturesMatch(signature, sign(secret, material))) return null

  let payload: BookingContextPayload
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as BookingContextPayload
  } catch {
    return null
  }

  if (payload?.v !== 1 || payload.purpose !== BOOKING_CONTEXT_PURPOSE) return null
  if (typeof payload.tenant_id !== 'string' || !UUID_RE.test(payload.tenant_id)) return null
  if (typeof payload.slug !== 'string' || !validSlug(payload.slug)) return null
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null
  if (payload.exp !== payload.iat + BOOKING_CONTEXT_TTL_MS) return null

  const now = options.now ?? Date.now()
  if (!Number.isFinite(now)) return null
  if (payload.iat > now + CLOCK_SKEW_MS) return null
  if (now >= payload.exp) return null

  return {
    tenantId: payload.tenant_id,
    slug: payload.slug,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  }
}

/**
 * Tenant for a marketing_touches insert.
 * Reads only a booking context. Extra request fields are not consulted.
 */
export function tenantIdForMarketingTouch(input: {
  bookingContext?: unknown
  secret: string
  now?: number
}): string | null {
  const token = typeof input.bookingContext === 'string' ? input.bookingContext : null
  return verifyBookingContext(token, { secret: input.secret, now: input.now })?.tenantId ?? null
}
