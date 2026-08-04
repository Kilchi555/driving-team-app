/**
 * Auto-enrich booking links with session ID + marketing attribution blob.
 * Modifies all simy.ch booking links to include `session_id` and (when
 * available) `dt_attr` so that cross-domain conversion tracking can attribute
 * the resulting booking back to the originating ad / campaign.
 *
 * Runs as early as DOM allows (not only after Vue hydration) so hero CTAs
 * clicked before app:mounted still carry click IDs.
 */

import { enrichSimyAnchor } from '~/utils/enrich-simy-url'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const enrichBookingLinks = () => {
    document.querySelectorAll('a[href*="simy.ch"]').forEach((link) => {
      enrichSimyAnchor(link as HTMLAnchorElement)
    })
  }

  const startObserver = () => {
    enrichBookingLinks()
    const observer = new MutationObserver(() => {
      enrichBookingLinks()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    })
  }

  // Enrich as soon as the DOM is ready — closes the race where users click
  // bare app.simy.ch hero links before Vue finishes mounting.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true })
  } else if (document.body) {
    startObserver()
  } else {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true })
  }

  // Re-enrich after hydration for links Vue may rewrite/replace.
  nuxtApp.hook('app:mounted', () => {
    enrichBookingLinks()
  })
})
