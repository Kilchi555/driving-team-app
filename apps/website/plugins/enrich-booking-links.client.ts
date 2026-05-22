/**
 * Auto-enrich booking links with session ID + marketing attribution blob.
 * Modifies all simy.ch booking links to include `session_id` and (when
 * available) `dt_attr` so that cross-domain conversion tracking can attribute
 * the resulting booking back to the originating ad / campaign.
 * Runs after Vue hydration to avoid SSR/client mismatch warnings.
 */

import { encodeAttribution } from '~/utils/attribution-encode'

export default defineNuxtPlugin((nuxtApp) => {
  const enrichBookingLinks = () => {
    const sessionId = (window as any).__analyticsSessionId || ''
    if (!sessionId) return

    const attributionBlob = encodeAttribution((window as any).__dtMarketingAttribution)

    const bookingLinks = document.querySelectorAll('a[href*="simy.ch"][href*="booking"]')

    bookingLinks.forEach((link) => {
      const href = link.getAttribute('href')
      if (!href) return

      let newHref = href
      const params: string[] = []

      if (!newHref.includes('session_id=')) {
        params.push(`session_id=${sessionId}`)
      }
      if (attributionBlob && !newHref.includes('dt_attr=')) {
        params.push(`dt_attr=${attributionBlob}`)
      }
      if (params.length === 0) return

      const separator = newHref.includes('?') ? '&' : '?'
      newHref = `${newHref}${separator}${params.join('&')}`
      link.setAttribute('href', newHref)
    })
  }

  // Run AFTER hydration is complete to avoid SSR/client mismatch
  nuxtApp.hook('app:mounted', () => {
    enrichBookingLinks()

    // Enrich on Vue updates (for dynamically added links)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          enrichBookingLinks()
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    })
  })
})
