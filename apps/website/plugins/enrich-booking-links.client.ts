/**
 * Auto-enrich booking links with session ID
 * Modifies all simy.ch booking links to include session_id parameter
 * Runs after Vue hydration to avoid SSR/client mismatch warnings
 */

export default defineNuxtPlugin((nuxtApp) => {
  const enrichBookingLinks = () => {
    const sessionId = (window as any).__analyticsSessionId || ''
    if (!sessionId) return

    const bookingLinks = document.querySelectorAll('a[href*="simy.ch"][href*="booking"]')

    bookingLinks.forEach((link) => {
      const href = link.getAttribute('href')
      if (!href) return

      if (href.includes('session_id=')) return

      const separator = href.includes('?') ? '&' : '?'
      link.setAttribute('href', `${href}${separator}session_id=${sessionId}`)
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
