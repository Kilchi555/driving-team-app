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
