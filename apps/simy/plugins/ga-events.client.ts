// Event delegation for simy.ch — tracks phone clicks and email clicks globally
// without needing per-component boilerplate.
// Events tracked:
//   phone_click  — clicks on tel: links
//   email_click  — clicks on mailto: links
// Explicit events (logo_upload, demo_email_sent, register_click, form submits)
// are fired directly in the respective page components via useGtag().

export default defineNuxtPlugin(() => {
  if (process.server) return
  const { gtag } = useGtag()

  document.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return
    const href = target.getAttribute('href') ?? ''

    if (href.startsWith('tel:')) {
      gtag('event', 'phone_click', {
        event_category: 'conversion',
        event_label: href.replace('tel:', ''),
        page_path: window.location.pathname,
      })
    }

    if (href.startsWith('mailto:')) {
      gtag('event', 'email_click', {
        event_category: 'engagement',
        event_label: href.replace('mailto:', ''),
        page_path: window.location.pathname,
      })
    }
  }, { passive: true })
})
