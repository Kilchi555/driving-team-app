/**
 * Auto-enrich booking links with session ID
 * Modifies all simy.ch booking links to include session_id parameter
 */

export default defineNuxtPlugin(() => {
  if (process.server) return

  const enrichBookingLinks = () => {
    const sessionId = (window as any).__analyticsSessionId || ''
    if (!sessionId) return

    // Find all simy.ch booking links
    const bookingLinks = document.querySelectorAll('a[href*="simy.ch"][href*="booking"]')

    bookingLinks.forEach((link) => {
      const href = link.getAttribute('href')
      if (!href) return

      // Check if session_id already in URL
      if (href.includes('session_id=')) return

      // Add session_id parameter
      const separator = href.includes('?') ? '&' : '?'
      const enrichedUrl = `${href}${separator}session_id=${sessionId}`

      link.setAttribute('href', enrichedUrl)
    })
  }

  // Enrich on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enrichBookingLinks)
  } else {
    enrichBookingLinks()
  }

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
