export default defineNuxtPlugin(() => {
  if (process.server) return // Nur client-side

  let lastTrackedPath: string | null = null

  const trackPage = async () => {
    try {
      const url = new URL(window.location.href)
      let path = url.pathname + url.search

      // Normalisiere: Immer mit Trailing Slash enden
      if (path !== '/' && !path.endsWith('/')) {
        path += '/'
      }

      // Verhindere Doppel-Tracking
      if (path === lastTrackedPath) return
      lastTrackedPath = path

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
