/**
 * Pure hop helpers for drivingteam.ch → app.simy.ch attribution.
 * No DOM. Safe for SSR, Nitro, and unit tests.
 *
 * Keep in sync with server/utils/booking-attribution-hop.ts
 * (this website app cannot import the root copy).
 */

import {
  mergeAttributionFields,
  type AttributionFields,
} from '../server/utils/marketing-attribution-merge'

export type { AttributionFields }
export { mergeAttributionFields }

export const FIRST_CLASS_CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid'] as const

export const BOOKING_APP_BASE_URL = 'https://app.simy.ch/booking/availability/driving-team'

export function constructFbcFromFbclid(fbclid: string, nowMs = Date.now()): string | null {
  const id = String(fbclid || '').trim()
  if (!id) return null
  return `fb.1.${nowMs}.${id}`
}

/** Meta `_fbc` is `fb.{subdomainIndex}.{creationTime}.{fbclid}`. */
export function fbcBelongsToFbclid(
  fbc: string | null | undefined,
  fbclid: string | null | undefined,
): boolean {
  const id = String(fbclid || '').trim()
  const token = String(fbc || '').trim()
  if (!id || !token) return false
  return token === id || token.endsWith(`.${id}`)
}

/**
 * A new fbclid must not keep a previous click's fbc (Meta prefers fbc).
 * UTM-only callers must not invoke this — pass no incoming fbclid and skip.
 * Cookie / stored / dt_attr fbc win only when they already encode this fbclid.
 */
export function resolveFbcForIncomingFbclid(input: {
  incomingFbclid?: string | null
  storedFbclid?: string | null
  storedFbc?: string | null
  cookieFbc?: string | null
  explicitFbc?: string | null
  nowMs?: number
}): string | null {
  const incoming = String(input.incomingFbclid || '').trim()
  if (!incoming) return null

  const explicit = String(input.explicitFbc || '').trim()
  if (fbcBelongsToFbclid(explicit, incoming)) return explicit

  const cookie = String(input.cookieFbc || '').trim()
  if (fbcBelongsToFbclid(cookie, incoming)) return cookie

  const storedId = String(input.storedFbclid || '').trim()
  const storedFbc = String(input.storedFbc || '').trim()
  if (storedId === incoming && fbcBelongsToFbclid(storedFbc, incoming)) return storedFbc

  return constructFbcFromFbclid(incoming, input.nowMs)
}

export function incomingClickRefreshesLandingPage(
  incoming: Pick<AttributionFields, 'utm_source' | 'fbclid' | 'gclid' | 'gbraid' | 'wbraid'>,
): boolean {
  return !!(incoming.utm_source || incoming.fbclid || incoming.gclid || incoming.gbraid || incoming.wbraid)
}

export const ANALYTICS_SESSION_STORAGE_KEY = 'analytics_session_id'
export const ANALYTICS_SESSION_ID_PATTERN = /^\d+_[0-9a-z]{9}$/

/** Same `{timestamp}_{9 base36 chars}` contract as before, without Math.random. */
export function createAnalyticsSessionId(nowMs = Date.now()): string {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.getRandomValues) {
    throw new Error('crypto.getRandomValues is required to mint analytics_session_id')
  }
  const bytes = new Uint8Array(9)
  cryptoObj.getRandomValues(bytes)
  let suffix = ''
  for (let i = 0; i < bytes.length; i++) {
    suffix += (bytes[i]! % 36).toString(36)
  }
  return `${nowMs}_${suffix}`
}

export function readOrCreateAnalyticsSessionId(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  nowMs?: number,
): string {
  const existing = storage.getItem(ANALYTICS_SESSION_STORAGE_KEY)
  if (existing) return existing
  const created = createAnalyticsSessionId(nowMs)
  storage.setItem(ANALYTICS_SESSION_STORAGE_KEY, created)
  return created
}

export function firstQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) value = value[0]
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

export function buchenQueryHasAttribution(query: Record<string, unknown>): boolean {
  return !!(
    firstQueryValue(query.fbclid)
    || firstQueryValue(query.gclid)
    || firstQueryValue(query.gbraid)
    || firstQueryValue(query.wbraid)
    || firstQueryValue(query.dt_attr)
    || firstQueryValue(query.session_id)
  )
}

/** Copy inbound /buchen query onto the booking-app URL. Does not invent click IDs. */
export function buildBuchenRedirectUrl(
  query: Record<string, unknown>,
  bookingBase = BOOKING_APP_BASE_URL,
): string {
  const url = new URL(bookingBase)
  for (const [key, value] of Object.entries(query)) {
    const raw = firstQueryValue(value)
    if (raw) url.searchParams.set(key, raw)
  }
  url.searchParams.delete('embed')
  return url.toString()
}

export function applyFirstClassClickIds(
  href: string,
  attr: AttributionFields | null | undefined,
  baseHref = 'https://drivingteam.ch/',
): string {
  const url = new URL(href, baseHref)
  if (attr) {
    for (const key of FIRST_CLASS_CLICK_ID_KEYS) {
      const value = attr[key]
      if (value && !url.searchParams.has(key)) {
        url.searchParams.set(key, value)
      }
    }
  }
  return url.toString()
}

export function recoverClickIds(
  sources: Array<AttributionFields | null | undefined>,
): AttributionFields {
  return sources.reduce<AttributionFields>(
    (acc, src) => mergeAttributionFields(acc, src),
    {},
  )
}

/**
 * Persistable booking_redirects click IDs: stored session row fills gaps;
 * truthy request fields win. Never writes empty over a stored click ID.
 */
export function resolveBookingRedirectClickIds(
  body: AttributionFields,
  stored: AttributionFields | null | undefined,
): AttributionFields {
  return mergeAttributionFields(stored, body)
}
