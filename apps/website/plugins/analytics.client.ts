export default defineNuxtPlugin(() => {
  if (process.server) return // Nur client-side

  const trackPage = async () => {
    try {
      const url = new URL(window.location.href)
      const path = url.pathname + url.search

      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: path,
          referrer: document.referrer,
        }),
      }).catch(() => {})
    } catch (err) {
      // Silently fail
    }
  }

  // Track initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPage)
  } else {
    trackPage()
  }

  // Track SPA route changes
  const router = useRouter()
  router.afterEach(() => {
    trackPage()
  })
})
