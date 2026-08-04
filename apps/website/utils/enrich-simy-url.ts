/**
 * Append session_id + dt_attr (+ optional Meta consent / referrer) to outbound
 * simy.ch URLs so cross-domain Google Ads attribution survives the hop from
 * drivingteam.ch → app.simy.ch.
 */

import { encodeAttribution } from '~/utils/attribution-encode'
import type { MarketingAttribution } from '~/plugins/marketing-attribution.client'

export function getWebsiteSessionId(): string {
  try {
    const fromWindow = (window as any).__analyticsSessionId
    if (fromWindow) return String(fromWindow)
    const fromStorage = localStorage.getItem('analytics_session_id')
    if (fromStorage) {
      ;(window as any).__analyticsSessionId = fromStorage
      return fromStorage
    }
  } catch {
    // ignore
  }
  return ''
}

export function getWebsiteAttribution(): MarketingAttribution | null {
  return ((window as any).__dtMarketingAttribution as MarketingAttribution | null | undefined) ?? null
}

/**
 * Returns an enriched absolute (or relative) URL. Does not mutate the input.
 * Safe to call repeatedly — existing session_id / dt_attr are left alone.
 */
export function enrichSimyUrl(href: string, options?: { referrer?: string | null }): string {
  if (!href || !href.includes('simy.ch')) return href

  try {
    const url = new URL(href, window.location.href)
    const sessionId = getWebsiteSessionId()
    const blob = encodeAttribution(getWebsiteAttribution())
    const metaConsentGiven = (() => {
      try {
        return localStorage.getItem('dt_cookie_consent') === 'accepted'
      } catch {
        return false
      }
    })()

    if (sessionId && !url.searchParams.has('session_id')) {
      url.searchParams.set('session_id', sessionId)
    }
    if (blob && !url.searchParams.has('dt_attr')) {
      url.searchParams.set('dt_attr', blob)
    }
    if (metaConsentGiven && !url.searchParams.has('mc')) {
      url.searchParams.set('mc', '1')
    }

    const isBookingPath = url.pathname.includes('/booking/')
    const referrer = options?.referrer ?? (isBookingPath ? window.location.href : null)
    if (referrer && !url.searchParams.has('referrer') && isBookingPath) {
      url.searchParams.set('referrer', referrer)
    }

    // Preserve relative vs absolute style of the original href when possible.
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return url.toString()
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return href
  }
}

/** Mutate an anchor's href in place. Returns true if the href changed. */
export function enrichSimyAnchor(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href')
  if (!href || !href.includes('simy.ch')) return false
  const next = enrichSimyUrl(href)
  if (next === href) return false
  anchor.setAttribute('href', next)
  return true
}
