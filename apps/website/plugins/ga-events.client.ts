// Tracks conversion events for Google Analytics 4, Meta Pixel, and Google Ads.
// Uses event delegation so there's no per-component boilerplate needed.
// Events tracked:
//   booking_click  – clicks on simy.ch booking links
//   phone_click    – clicks on tel: links
//   form_submit    – contact/lead form submissions
export default defineNuxtPlugin(() => {
  if (process.server) return
  const { gtag } = useGtag()
  const config = useRuntimeConfig()

  function fireMetaEvent(event: string, params?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      ;(window as any).fbq('track', event, params)
    }
  }

  function fireGoogleAdsConversion() {
    const { googleAdsId, googleAdsConversionLabel } = config.public
    if (googleAdsId && googleAdsConversionLabel) {
      gtag('event', 'conversion', { send_to: `${googleAdsId}/${googleAdsConversionLabel}` })
    }
  }

  document.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return

    const href = target.getAttribute('href') ?? ''

    if (href.includes('simy.ch/booking')) {
      const parsedUrl = new URL(href, window.location.href)
      const service = parsedUrl.searchParams.get('service') ?? 'unknown'
      const category = parsedUrl.searchParams.get('category') || service

      gtag('event', 'booking_click', {
        event_category: 'conversion',
        event_label: service,
        page_path: window.location.pathname,
      })
      // Meta Pixel: Lead event on booking click (proxy conversion for app.simy.ch bookings)
      fireMetaEvent('Lead', { content_name: service, content_category: 'booking' })
      // Google Ads: fire conversion tag
      fireGoogleAdsConversion()

      // First-party server-side logging — independent of GA4/consent/ad-blockers
      const sessionId = (window as any).__analyticsSessionId || 'unknown'
      const pageParams = new URLSearchParams(window.location.search)
      fetch('/api/booking-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          category,
          referrer_page: window.location.pathname,
          utm_source: pageParams.get('utm_source') || null,
          utm_medium: pageParams.get('utm_medium') || null,
          utm_campaign: pageParams.get('utm_campaign') || null,
          utm_content: pageParams.get('utm_content') || null,
        }),
      }).catch(() => {})
    }

    if (href.startsWith('tel:')) {
      gtag('event', 'phone_click', {
        event_category: 'conversion',
        event_label: href.replace('tel:', ''),
        page_path: window.location.pathname,
      })
      // Meta Pixel: Contact event on phone click
      fireMetaEvent('Contact')
    }
  }, { passive: true })

  // Track form submissions (contact, lead magnet, etc.)
  document.addEventListener('submit', (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement
    const formId = form.id || form.dataset.category || 'unknown'
    gtag('event', 'form_submit', {
      event_category: 'conversion',
      event_label: formId,
      page_path: window.location.pathname,
    })
    // Meta Pixel: Lead event on form submit
    fireMetaEvent('Lead', { content_name: formId, content_category: 'form' })
  }, { passive: true })
})
