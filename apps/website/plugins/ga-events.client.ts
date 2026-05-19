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
      const service = new URL(href, window.location.href).searchParams.get('service') ?? 'unknown'
      gtag('event', 'booking_click', {
        event_category: 'conversion',
        event_label: service,
        page_path: window.location.pathname,
      })
      // Meta Pixel: Lead event on booking click (proxy conversion for app.simy.ch bookings)
      fireMetaEvent('Lead', { content_name: service, content_category: 'booking' })
      // Google Ads: fire conversion tag
      fireGoogleAdsConversion()
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
