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

    incoming.fbc = fbcFromCookie
      ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null)
    incoming.fbp = fbpFromCookie ?? null

    const hasNewAttribution = Object.values(incoming).some(v => v !== null && v !== '')

    // Last-touch attribution: if a user arrives with new ad/utm params, overwrite stored values.
    // Otherwise hydrate from storage so subsequent navigation can still forward attribution.
    // Always update fbc/fbp from cookies even on returning visits (Pixel may have run since).
    if (hasNewAttribution) {
      const attribution: MarketingAttribution = {
        ...incoming,
        landing_page: url.pathname,
        captured_at: Date.now(),
      }
      persist(attribution)
      window.__dtMarketingAttribution = attribution

      // Persist to DB immediately so we capture the visit even if the user
      // never clicks a booking link (fire-and-forget, never blocks rendering).
      const sessionId = (window as any).__analyticsSessionId
        ?? localStorage.getItem('analytics_session_id')
      if (sessionId) {
        fetch('/api/save-attribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, attribution }),
        }).catch(() => {})
      }
    } else {
      const stored = readStored()
      if (stored) {
        // Enrich stored attribution with fbc/fbp if cookies appeared since last capture
        // (user accepted cookies on a subsequent visit).
        const fbcFromCookie = readCookie('_fbc')
        const fbpFromCookie = readCookie('_fbp')
        if ((fbcFromCookie && !stored.fbc) || (fbpFromCookie && !stored.fbp)) {
          const enriched = {
            ...stored,
            fbc: fbcFromCookie ?? stored.fbc ?? null,
            fbp: fbpFromCookie ?? stored.fbp ?? null,
          }
          persist(enriched)
          window.__dtMarketingAttribution = enriched
        } else {
          window.__dtMarketingAttribution = stored
        }
      } else {
        window.__dtMarketingAttribution = null
      }
    }
  },
})
