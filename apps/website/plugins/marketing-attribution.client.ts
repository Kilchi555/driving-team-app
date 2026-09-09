/**
 * Marketing Attribution Capture (drivingteam.ch)
 *
 * Captures ad click IDs (gclid, gbraid, wbraid, fbclid) and UTM parameters when
 * a user arrives from a paid campaign. Also reads Meta's _fbc and _fbp cookies
 * (set by the Meta Pixel after consent) for server-side Conversions API (CAPI).
 *
 * Persists in localStorage with a 90-day expiry and exposes on window for use
 * by other plugins (enrich-booking-links, useBookingUrl).
 *
 * Cross-domain server-side conversion tracking:
 *   1. Capture (here) — gclid, fbclid, fbc, fbp, UTMs
 *   2. Forward to app.simy.ch via URL parameter (dt_attr blob)
 *   3. Persist in DB (marketing_attributions table)
 *   4. Upload conversion to Google Ads API + Meta CAPI on booking completion
 */

import {
  incomingClickRefreshesLandingPage,
  mergeAttributionFields,
  createAnalyticsSessionId,
  readOrCreateAnalyticsSessionId,
  resolveFbcForIncomingFbclid,
} from '~/utils/booking-attribution-hop'

const STORAGE_KEY = 'dt_marketing_attribution'
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export interface MarketingAttribution {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  /** Meta click ID — from ?fbclid= URL param when arriving from a Meta ad. */
  fbclid?: string | null
  /**
   * Meta browser click cookie (_fbc). Format: fb.1.{timestamp}.{fbclid}
   * Set by Meta's Pixel SDK or constructed here from fbclid if Pixel hasn't run.
   */
  fbc?: string | null
  /**
   * Meta browser ID cookie (_fbp). Format: fb.1.{timestamp}.{random}
   * Set by Meta's Pixel SDK. Persists across sessions for the same browser.
   */
  fbp?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  landing_page?: string | null
  captured_at: number
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

declare global {
  interface Window {
    __dtMarketingAttribution?: MarketingAttribution | null
  }
}

function readCookieDecoded(name: string): string | null {
  return readCookie(name)
}

function readStored(): MarketingAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MarketingAttribution
    if (!parsed.captured_at || Date.now() - parsed.captured_at > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function persist(attribution: MarketingAttribution): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    // localStorage may be unavailable (private mode, quota) — fail silently
  }
}

/**
 * Get-or-create the analytics session id (same localStorage key used by
 * `analytics.client.ts`). This plugin runs with `enforce: 'pre'`, i.e.
 * BEFORE the normal-priority `analytics.client.ts` plugin — so on a brand
 * new visitor's very first pageview (the highest-value case: landing
 * straight from a Google/Meta ad click), `window.__analyticsSessionId` and
 * the `analytics_session_id` localStorage key don't exist yet. Previously
 * this meant `/api/save-attribution` was silently skipped for exactly the
 * first-touch sessions that matter most, so the gclid was never persisted
 * to `marketing_attributions` and the eventual booking conversion upload
 * failed with `no_click_id`. Creating the session id here (idempotently,
 * same format/key `analytics.client.ts` uses) closes that gap.
 */
function getOrCreateSessionId(): string {
  try {
    const sessionId = readOrCreateAnalyticsSessionId(localStorage)
    ;(window as any).__analyticsSessionId = sessionId
    return sessionId
  } catch {
    const fromWindow = (window as any).__analyticsSessionId
    if (fromWindow) return String(fromWindow)
    const sessionId = createAnalyticsSessionId()
    ;(window as any).__analyticsSessionId = sessionId
    return sessionId
  }
}

export default defineNuxtPlugin({
  name: 'marketing-attribution',
  // Must run before enrich-booking-links and ga-events so they can read
  // window.__dtMarketingAttribution when building booking URLs / firing events.
  enforce: 'pre',
  setup() {
    if (process.server) return

    const url = new URL(window.location.href)
    const params = url.searchParams

    const incoming: Partial<MarketingAttribution> = {
      gclid: params.get('gclid'),
      gbraid: params.get('gbraid'),
      wbraid: params.get('wbraid'),
      fbclid: params.get('fbclid'),
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
    }

    // Read Meta's _fbc and _fbp cookies (set by Meta Pixel after consent).
    // If the user arrived with ?fbclid= but Pixel hasn't run yet (pre-consent),
    // construct _fbc manually — Meta accepts this format.
    const fbcFromCookie = readCookie('_fbc')
    const fbpFromCookie = readCookie('_fbp')
    const fbclid = incoming.fbclid
    const stored = readStored()

    incoming.fbc = fbclid
      ? resolveFbcForIncomingFbclid({
          incomingFbclid: fbclid,
          storedFbclid: stored?.fbclid,
          storedFbc: stored?.fbc,
          cookieFbc: fbcFromCookie,
        })
      : (fbcFromCookie ?? null)
    incoming.fbp = fbpFromCookie ?? null

    const hasIncomingClickOrUtm = Object.values(incoming).some(v => v !== null && v !== '')

    // Merge, never last-touch-replace: a later UTM-only pageview must not wipe fbclid/gclid.
    if (hasIncomingClickOrUtm || stored) {
      const mergedFields = mergeAttributionFields(stored, {
        ...incoming,
        landing_page: incomingClickRefreshesLandingPage(incoming)
          ? url.pathname
          : stored?.landing_page,
      })
      const hasNewClickId = !!(incoming.gclid || incoming.gbraid || incoming.wbraid || incoming.fbclid)
      const attribution: MarketingAttribution = {
        ...mergedFields,
        landing_page: mergedFields.landing_page || url.pathname,
        captured_at: hasNewClickId || !stored?.captured_at ? Date.now() : stored.captured_at,
      }
      persist(attribution)
      window.__dtMarketingAttribution = attribution

      if (hasIncomingClickOrUtm || attribution.gclid || attribution.gbraid || attribution.wbraid || attribution.fbclid) {
        const sessionId = getOrCreateSessionId()
        fetch('/api/save-attribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, attribution }),
        }).catch(() => {})
      }
    } else {
      window.__dtMarketingAttribution = null
    }
  },
})
