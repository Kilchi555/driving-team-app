// Tracks conversion events for Google Analytics 4, Meta Pixel, and first-party Supabase.
// Uses event delegation so there's no per-component boilerplate needed.
// Events tracked:
//   booking_click  – clicks on simy.ch booking/customer links
//   phone_click    – clicks on tel: links (GA4 + Meta + first-party DB)
//   form_submit    – contact/lead form submissions

// Maps page paths to driving category codes when the booking URL has no category param.
// This fixes the "unknown" category problem for VKU, Taxi, Bus, Motorboot, etc.
function inferCategoryFromPath(pathname: string): string {
  const p = pathname.toLowerCase()
  if (p.includes('motorrad') || p.includes('grundkurs') || p.includes('/motorrad-a')) return 'A'
  if (p.includes('anhaenger') || p.includes('anhänger')) return 'BE'
  if (p.includes('lastwagen') || p.includes('lkw') || p.includes('kategorie-c')) return 'C'
  if (p.includes('bus-fahrschule') || p.includes('bus-theorie') || p.includes('kategorie-d')) return 'D'
  if (p.includes('taxi')) return 'Taxi'
  if (p.includes('vku') || p.includes('verkehrskunde')) return 'VKU'
  if (p.includes('motorboot') || p.includes('bootsfahrschule') || p.includes('boots')) return 'Motorboot'
  if (p.includes('auto-fahrschule') || p.includes('auto-theorie') || p.includes('fahrstunden') || p.includes('kategorie-b')) return 'B'
  if (p.includes('nothelferkurs') || p.includes('nothelfer')) return 'Nothelfer'
  if (p.includes('wab') || p.includes('czv')) return 'WAB'
  return 'unknown'
}

export default defineNuxtPlugin(() => {
  if (process.server) return
  const { gtag } = useGtag()
  const config = useRuntimeConfig()

  function fireMetaEvent(event: string, params?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      ;(window as any).fbq('track', event, params)
    }
  }

  function fireGoogleAdsConversion(labelOverride?: string) {
    const adsId = config.public.googleAdsId
    const adsLabel = labelOverride || config.public.googleAdsConversionLabel
    if (adsId && adsLabel) {
      gtag('event', 'conversion', { send_to: `${adsId}/${adsLabel}` })
    }
  }

  function getUtmParams() {
    // Prefer stored attribution (persisted across pages) over current URL params
    const attr = (window as any).__dtMarketingAttribution ?? {}
    const p = new URLSearchParams(window.location.search)
    return {
      utm_source: attr.utm_source || p.get('utm_source') || null,
      utm_medium: attr.utm_medium || p.get('utm_medium') || null,
      utm_campaign: attr.utm_campaign || p.get('utm_campaign') || null,
      utm_content: attr.utm_content || p.get('utm_content') || null,
      utm_term: attr.utm_term || p.get('utm_term') || null,
    }
  }

  document.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return

    const href = target.getAttribute('href') ?? ''

    // Match all outbound simy.ch links (booking AND customer/course links)
    if (href.includes('simy.ch')) {
      const parsedUrl = new URL(href, window.location.href)
      // Try URL params first, fall back to page-path inference
      const service = parsedUrl.searchParams.get('service') ?? ''
      const urlCategory = parsedUrl.searchParams.get('category') || service
      const category = urlCategory || inferCategoryFromPath(window.location.pathname)

      gtag('event', 'booking_click', {
        event_category: 'conversion',
        event_label: category,
        page_path: window.location.pathname,
      })
      fireMetaEvent('Lead', { content_name: category, content_category: 'booking' })
      fireGoogleAdsConversion()

      const sessionId = (window as any).__analyticsSessionId || 'unknown'
      fetch('/api/booking-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          category,
          referrer_page: window.location.pathname,
          ...getUtmParams(),
        }),
      }).catch(() => {})
    }

    if (href.startsWith('tel:')) {
      const phoneNumber = href.replace('tel:', '')
      gtag('event', 'phone_click', {
        event_category: 'conversion',
        event_label: phoneNumber,
        page_path: window.location.pathname,
      })
      fireMetaEvent('Contact')
      // Use phone-specific label if set, otherwise fall back to the general conversion label
      fireGoogleAdsConversion((config.public as any).googleAdsPhoneConversionLabel || undefined)

      // First-party DB log for phone clicks
      const sessionId = (window as any).__analyticsSessionId || 'unknown'
      fetch('/api/phone-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          phone_number: phoneNumber,
          referrer_page: window.location.pathname,
          ...getUtmParams(),
        }),
      }).catch(() => {})
    }
  }, { passive: true })

  // Track form submissions (contact, lead magnet, etc.)
  document.addEventListener('submit', (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement
    if (form.dataset.skipGaSubmit !== undefined) return
    const formId = form.id || form.dataset.category || 'unknown'
    gtag('event', 'form_submit', {
      event_category: 'conversion',
      event_label: formId,
      page_path: window.location.pathname,
    })
    fireMetaEvent('Lead', { content_name: formId, content_category: 'form' })
  }, { passive: true })
})
