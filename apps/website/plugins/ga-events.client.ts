// Tracks conversion events for Google Analytics 4, Meta Pixel, and first-party Supabase.
// Uses event delegation so there's no per-component boilerplate needed.
// Events tracked:
//   ViewContent       – service/landing page views (Meta retargeting audiences)
//   InitiateCheckout  – clicks on simy.ch booking/customer links (Meta only; NOT Google Ads)
//   Contact           – tel: link clicks (Meta + GA4; NOT Google Ads)
//   Lead              – only from successful inquiry forms (see GeneralInquiryForm)
//   form_submit (GA4) – contact/lead form submissions
//
// Google Ads primary conversions are server-side only after paid booking/course
// (Server: Booking Completed via app.simy.ch). Do not fire gtag conversion here.
//
// CRITICAL: On every simy.ch click we rewrite the href (capture phase) to append
// session_id + dt_attr BEFORE navigation. Logging booking_redirects alone is not
// enough — without those params the booking app mints a new session and loses gclid.

import { enrichSimyAnchor, getWebsiteSessionId } from '~/utils/enrich-simy-url'

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
  // Location / school pages still count as Auto (Kat. B) intent for retargeting
  if (
    p.includes('fahrschule-') ||
    p.includes('fahrlehrer') ||
    p === '/auto-fahrschule/' ||
    p === '/auto-fahrschule'
  ) return 'B'
  return 'unknown'
}

export default defineNuxtPlugin(() => {
  if (process.server) return
  const { gtag } = useGtag()
  const router = useRouter()

  function fireMetaEvent(event: string, params?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      ;(window as any).fbq('track', event, params)
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

  // BUG FIX (July 2026): booking-redirect only forwarded UTM params, never the
  // actual click IDs (gclid/gbraid/wbraid) — so booking_redirects and the eventual
  // Google Ads conversion upload had no click ID to work with for the vast majority
  // of real bookings, which all go through this global link click-handler (not the
  // less-used useBookingTracking.ts composable, which already had this fix).
  function getClickIds() {
    const attr = (window as any).__dtMarketingAttribution ?? {}
    const p = new URLSearchParams(window.location.search)
    return {
      gclid: attr.gclid || p.get('gclid') || null,
      gbraid: attr.gbraid || p.get('gbraid') || null,
      wbraid: attr.wbraid || p.get('wbraid') || null,
    }
  }

  // ── ViewContent: service pages → Meta content audiences for retargeting ──
  let lastViewContentPath: string | null = null

  function trackViewContent(pathname: string) {
    const category = inferCategoryFromPath(pathname)
    if (category === 'unknown') return
    if (pathname === lastViewContentPath) return
    lastViewContentPath = pathname

    gtag('event', 'view_content', {
      event_category: 'engagement',
      event_label: category,
      page_path: pathname,
    })
    fireMetaEvent('ViewContent', {
      content_name: category,
      content_category: 'service',
      content_type: 'product',
    })
  }

  // Initial page (plugin may load after first paint)
  trackViewContent(window.location.pathname)
  router.afterEach((to) => {
    trackViewContent(to.path)
  })

  // Capture phase + non-passive: mutate href before the browser follows it
  // (including target=_blank / cmd-click). This is the primary fix for FS
  // campaigns showing 0 conversions despite real bookings.
  document.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null
    if (!target) return

    let href = target.getAttribute('href') ?? ''

    // Match all outbound simy.ch links (booking AND customer/course links)
    if (href.includes('simy.ch')) {
      // Rewrite BEFORE reading final href / navigating — closes pre-mount race.
      enrichSimyAnchor(target)
      href = target.getAttribute('href') ?? href

      const parsedUrl = new URL(href, window.location.href)
      // Try URL params first, fall back to page-path inference
      const service = parsedUrl.searchParams.get('service') ?? ''
      const urlCategory = parsedUrl.searchParams.get('category') || service
      const category = urlCategory || inferCategoryFromPath(window.location.pathname)

      gtag('event', 'booking_click', {
        event_category: 'engagement',
        event_label: category,
        page_path: window.location.pathname,
      })
      // Hot funnel signal for Meta retargeting — do NOT use Lead (pollutes optimization).
      // Google Ads conversion must NOT fire here: this is only a click to the booking
      // app, not a paid course/appointment. Paid conversions upload server-side
      // (Server: Booking Completed) after payment / confirmed booking.
      fireMetaEvent('InitiateCheckout', {
        content_name: category,
        content_category: 'booking',
        currency: 'CHF',
      })

      const sessionId = getWebsiteSessionId() || 'unknown'
      fetch('/api/booking-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          category,
          referrer_page: window.location.pathname,
          ...getClickIds(),
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
      // Do not fire Google Ads conversion on tel: clicks — that would count as a
      // primary conversion before any paid booking. Phone stays GA4 + Meta Contact.

      // First-party DB log for phone clicks
      const sessionId = getWebsiteSessionId() || 'unknown'
      fetch('/api/phone-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          phone_number: phoneNumber,
          referrer_page: window.location.pathname,
          marketing_attribution: (window as any).__dtMarketingAttribution ?? null,
          ...getUtmParams(),
        }),
      }).catch(() => {})
    }
  }, { capture: true })

  // pointerdown fires earlier than click — covers slow enrich / touch devices.
  document.addEventListener('pointerdown', (e: PointerEvent) => {
    const target = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null
    if (!target) return
    const href = target.getAttribute('href') ?? ''
    if (href.includes('simy.ch')) enrichSimyAnchor(target)
  }, { capture: true })

  // GA4 only on generic form submit. Meta Lead must fire on *successful* inquiry
  // only (GeneralInquiryForm / waitlist) — not on every form attempt or lead magnet.
  document.addEventListener('submit', (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement
    if (form.dataset.skipGaSubmit !== undefined) return
    const formId = form.id || form.dataset.category || 'unknown'
    gtag('event', 'form_submit', {
      event_category: 'conversion',
      event_label: formId,
      page_path: window.location.pathname,
    })
  }, { passive: true })
})
