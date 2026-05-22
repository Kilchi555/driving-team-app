/**
 * Marketing Attribution Capture (drivingteam.ch)
 *
 * Captures ad click IDs (gclid, gbraid, wbraid) and UTM parameters when a user
 * arrives from a paid campaign. Persists them in localStorage with a 90-day
 * expiry (matches Google's default attribution window) and exposes them on
 * window for use by other plugins (enrich-booking-links, useBookingUrl).
 *
 * This is the first stage of cross-domain server-side conversion tracking:
 *   1. Capture (here)
 *   2. Forward to app.simy.ch via URL parameter
 *   3. Persist in DB (marketing_attributions table)
 *   4. Upload conversion to Google Ads API on booking completion
 */

const STORAGE_KEY = 'dt_marketing_attribution'
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export interface MarketingAttribution {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  landing_page?: string | null
  captured_at: number
}

declare global {
  interface Window {
    __dtMarketingAttribution?: MarketingAttribution | null
  }
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
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
    }

    const hasNewAttribution = Object.values(incoming).some(v => v !== null && v !== '')

    // Last-touch attribution: if a user arrives with new ad/utm params, overwrite stored values.
    // Otherwise hydrate from storage so subsequent navigation can still forward attribution.
    if (hasNewAttribution) {
      const attribution: MarketingAttribution = {
        ...incoming,
        landing_page: url.pathname,
        captured_at: Date.now(),
      }
      persist(attribution)
      window.__dtMarketingAttribution = attribution
    } else {
      window.__dtMarketingAttribution = readStored()
    }
  },
})
