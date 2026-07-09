/**
 * Cross-domain session tracking plugin.
 * Carries session ID + marketing attribution (gclid, UTMs) from drivingteam.ch
 * to app.simy.ch and persists them in localStorage + the marketing_attributions
 * table so server-side conversion upload can attribute the resulting booking.
 *
 * Funnel: Views (drivingteam.ch) → Buchungs-Klick → Booking Page → Booking Confirmed
 */

import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { decodeAttribution, type DecodedAttribution } from '~/utils/attribution-decode'

declare global {
  interface Window {
    __analyticsSessionId: string
    __marketingAttribution?: DecodedAttribution | null
    __tenantId?: string | null
    __setTenantId: (id: string) => void
    __trackBookingEvent: (eventType: 'viewed' | 'started' | 'completed' | 'abandoned' | 'inquiry_submitted', data: Record<string, any>) => Promise<void>
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

/**
 * Initialize Meta Pixel on app.simy.ch when the user has already given consent
 * on drivingteam.ch (forwarded via `mc=1` URL param in booking links).
 * Required for browser-side Purchase deduplication against server-side CAPI.
 */
function initMetaPixelIfConsented(pixelId: string, metaConsentParam: string | null): void {
  if (!pixelId || metaConsentParam !== '1' || window.fbq) return

  const n: any = window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  }
  if (!window._fbq) window._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []
  const t = document.createElement('script')
  t.async = true
  t.src = 'https://connect.facebook.net/en_US/fbevents.js'
  const s = document.getElementsByTagName('script')[0]
  s.parentNode?.insertBefore(t, s)

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
}

export default defineNuxtPlugin(() => {
  if (process.server) return

  const config = useRuntimeConfig()

  // Get or create session ID — runs on ALL simy.ch pages, not just /booking/
  const getSessionId = (): string => {
    const key = 'analytics_session_id'
    
    // First, check URL parameters (from drivingteam.ch redirect)
    const urlParams = new URLSearchParams(window.location.search)
    const sessionFromUrl = urlParams.get('session_id')
    
    if (sessionFromUrl) {
      localStorage.setItem(key, sessionFromUrl)
      return sessionFromUrl
    }

    // Then check localStorage (returning visitor who previously came from drivingteam.ch)
    let sessionId = localStorage.getItem(key)
    
    if (!sessionId) {
      sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem(key, sessionId)
    }
    
    return sessionId
  }

  const sessionId = getSessionId()

  // ─── Meta Pixel: initialize on simy.ch if consent was given on drivingteam.ch ─
  const urlParams = new URLSearchParams(window.location.search)
  const metaConsentParam = urlParams.get('mc')
  const pixelId = (config.public as any).metaPixelId as string | undefined
  if (pixelId) {
    initMetaPixelIfConsented(pixelId, metaConsentParam)
  }

  // ─── Marketing attribution: read from URL blob OR localStorage ──────────────
  const ATTR_KEY = 'sm_marketing_attribution'
  let attribution: DecodedAttribution | null = null
  let isNewSession = false

  const dtAttr = urlParams.get('dt_attr')
  // Direct click IDs in URL — present when Google Ads links directly to app.simy.ch
  // instead of going through drivingteam.ch (which would produce a dt_attr blob).
  const gclidFromUrl = urlParams.get('gclid')
  const gbraidFromUrl = urlParams.get('gbraid')
  const wbraidFromUrl = urlParams.get('wbraid')

  if (dtAttr) {
    attribution = decodeAttribution(dtAttr)
    if (attribution) {
      try {
        localStorage.setItem(ATTR_KEY, JSON.stringify(attribution))
      } catch {
        // localStorage may be unavailable — fail silently
      }
      // Persist server-side so it can be joined to the appointment later.
      fetch('/api/marketing-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, tenant_id: window.__tenantId ?? null, attribution }),
      }).catch(() => {})
    }
  } else if (gclidFromUrl || gbraidFromUrl || wbraidFromUrl) {
    // Fallback: Google Ads linked directly to app.simy.ch with ?gclid= in the URL.
    // Build the attribution from the raw click-ID params so the booking conversion
    // can still be uploaded server-side.
    attribution = {
      gclid: gclidFromUrl ?? null,
      gbraid: gbraidFromUrl ?? null,
      wbraid: wbraidFromUrl ?? null,
      fbclid: null,
      fbc: null,
      fbp: null,
      utm_source: urlParams.get('utm_source') ?? 'google',
      utm_medium: urlParams.get('utm_medium') ?? 'cpc',
      utm_campaign: urlParams.get('utm_campaign') ?? null,
      utm_content: urlParams.get('utm_content') ?? null,
      utm_term: urlParams.get('utm_term') ?? null,
      landing_page: window.location.pathname,
    }
    try {
      localStorage.setItem(ATTR_KEY, JSON.stringify(attribution))
    } catch {
      // ignore
    }
    fetch('/api/marketing-attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, tenant_id: window.__tenantId ?? null, attribution }),
    }).catch(() => {})
  } else {
    try {
      const stored = localStorage.getItem(ATTR_KEY)
      if (stored) {
        attribution = JSON.parse(stored) as DecodedAttribution
      } else {
        // No attribution from drivingteam.ch — mark as direct so we always have a source
        isNewSession = true
      }
    } catch {
      isNewSession = true
    }
  }

  // Persist direct-traffic sessions so they also appear in marketing_attributions.
  // This allows us to count and report direct bookings separately from website-attributed ones.
  if (isNewSession) {
    const fromWebsite = document.referrer.includes('drivingteam.ch')
    fetch('/api/marketing-attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        tenant_id: window.__tenantId ?? null,
        attribution: {
          utm_source: fromWebsite ? 'drivingteam_direct' : 'direct',
          utm_medium: fromWebsite ? 'referral' : 'none',
          landing_page: window.location.pathname,
        },
      }),
    }).catch(() => {})
  }

  window.__marketingAttribution = attribution

  // Track booking events — only fire when on a valid booking/availability page
  const trackBookingEvent = async (eventType: 'viewed' | 'started' | 'completed' | 'abandoned' | 'inquiry_submitted', data: Record<string, any>) => {
    const currentPath = window.location.pathname
    const isValidBookingPath = currentPath.includes('/booking/') || currentPath.includes('/availability/')
    if (!isValidBookingPath) return

    try {
      await fetch('/api/booking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          tenant_id: window.__tenantId ?? null,
          event_type: eventType,
          page: currentPath,
          ...data,
        }),
      }).catch(() => {})
    } catch (err) {
      // Silently fail
    }
  }

  // Expose utilities to window
  window.__analyticsSessionId = sessionId
  window.__tenantId = null
  window.__setTenantId = (id: string) => { window.__tenantId = id }
  window.__trackBookingEvent = trackBookingEvent

  // Track page view on initial load
  trackBookingEvent('viewed', {
    referrer: document.referrer,
  })

  // Track if user leaves without completing booking
  let bookingCompleted = false
  const originalTrack = window.__trackBookingEvent
  window.__trackBookingEvent = async (eventType, data) => {
    if (eventType === 'completed' || eventType === 'inquiry_submitted') bookingCompleted = true
    return originalTrack(eventType, data)
  }

  // Fire Meta Pixel Purchase when booking is completed.
  // eventID must match CAPI event_id (`capi_{appointment_id}`) for deduplication.
  const originalTrackWithPixel = window.__trackBookingEvent
  window.__trackBookingEvent = async (eventType, data) => {
    if (eventType === 'completed' && data.appointment_id && window.fbq) {
      window.fbq('track', 'Purchase', { currency: 'CHF' }, { eventID: `capi_${data.appointment_id}` })
    }
    return originalTrackWithPixel(eventType, data)
  }

  window.addEventListener('beforeunload', () => {
    if (bookingCompleted) return
    if (window.location.pathname.includes('booking') || window.location.pathname.includes('availability')) {
      // sendBeacon requires a Blob with explicit content-type so the server can parse it as JSON
      const payload = JSON.stringify({
        session_id: sessionId,
        event_type: 'abandoned',
        page: window.location.pathname,
      })
      navigator.sendBeacon('/api/booking-events', new Blob([payload], { type: 'application/json' }))
    }
  })
})
