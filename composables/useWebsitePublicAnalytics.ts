export function useWebsitePublicAnalytics(
  websiteId: { value: string | null | undefined },
  preview: { value: boolean },
) {
  function track(eventType: string, kind?: string) {
    const id = websiteId.value
    if (!id || preview.value || import.meta.server) return
    const href = typeof window !== 'undefined' ? window.location.href : ''
    $fetch('/api/website/analytics/track', {
      method: 'POST',
      body: {
        website_id: id,
        event_type: eventType,
        event_url: kind ? `${href}#${kind}` : href,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
    }).catch(() => {})
  }

  function trackPageview() {
    track('pageview')
  }

  function trackCta(kind: string) {
    track('cta_click', kind)
  }

  return { trackPageview, trackCta }
}
