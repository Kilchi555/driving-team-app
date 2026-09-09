/**
 * Composable zur Verfolgung von Buchungs-Sessions
 * Trackt wenn Besucher auf Simy klicken und erfasst Redirect Events
 */

import { encodeAttribution } from '~/utils/attribution-encode'
import { applyFirstClassClickIds } from '~/utils/booking-attribution-hop'
import { getWebsiteAttribution, getWebsiteSessionId } from '~/utils/enrich-simy-url'

export const useBookingTracking = () => {
  /**
   * Generiert Booking-URL mit Session ID und trackt den Klick
   */
  const generateBookingUrlWithTracking = (url: string, category?: string): string => {
    const sessionId = getWebsiteSessionId() || (window as any).__analyticsSessionId || 'unknown'
    const attr = getWebsiteAttribution()

    const params = new URLSearchParams()
    if (!url.includes('session_id=')) {
      params.set('session_id', sessionId)
    }
    const dtAttr = encodeAttribution(attr)
    if (dtAttr && !url.includes('dt_attr=')) {
      params.set('dt_attr', dtAttr)
    }

    const separator = url.includes('?') ? '&' : '?'
    const query = params.toString()
    const trackedUrl = query ? `${url}${separator}${query}` : url
    const withClickIds = applyFirstClassClickIds(trackedUrl, attr, window.location.href)

    trackBookingRedirect(category || 'unknown', sessionId, attr ?? {})

    return withClickIds
  }

  /**
   * Trackt dass Besucher auf Booking-Seite weitergeleitet wurde
   */
  const trackBookingRedirect = async (
    category: string,
    sessionId: string,
    attr: Record<string, string | null | undefined> = {},
  ) => {
    try {
      await fetch('/api/booking-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          session_id: sessionId,
          referrer_page: window.location.pathname,
          gclid: attr.gclid ?? null,
          gbraid: attr.gbraid ?? null,
          wbraid: attr.wbraid ?? null,
          fbclid: attr.fbclid ?? null,
          fbc: attr.fbc ?? null,
          fbp: attr.fbp ?? null,
          utm_source: attr.utm_source ?? null,
          utm_medium: attr.utm_medium ?? null,
          utm_campaign: attr.utm_campaign ?? null,
          utm_content: attr.utm_content ?? null,
          utm_term: attr.utm_term ?? null,
        }),
      }).catch(() => {})
    } catch {
      // Silently fail
    }
  }

  return {
    generateBookingUrlWithTracking,
    trackBookingRedirect,
  }
}
