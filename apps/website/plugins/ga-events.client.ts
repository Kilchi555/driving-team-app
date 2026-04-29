// Tracks conversion events for Google Analytics 4.
// Uses event delegation so there's no per-component boilerplate needed.
// Events tracked:
//   booking_click  – clicks on simy.ch booking links
//   phone_click    – clicks on tel: links
//   form_submit    – contact/lead form submissions
export default defineNuxtPlugin(() => {
  if (process.server) return
  const { gtag } = useGtag()

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
    }

    if (href.startsWith('tel:')) {
      gtag('event', 'phone_click', {
        event_category: 'conversion',
        event_label: href.replace('tel:', ''),
        page_path: window.location.pathname,
      })
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
  }, { passive: true })
})
