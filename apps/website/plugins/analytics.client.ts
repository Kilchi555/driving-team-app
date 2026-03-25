export default defineNuxtPlugin(() => {
  if (process.server) return // Nur client-side

  // Generate or retrieve session ID
  const getSessionId = (): string => {
    const key = 'analytics_session_id'
    let sessionId = localStorage.getItem(key)
    
    if (!sessionId) {
      sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem(key, sessionId)
    }
    
    return sessionId
  }

  const sessionId = getSessionId()
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

      const payload = {
        page: path,
        referrer: document.referrer,
        sessionId,
      }

      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // Expose sessionId to window for other scripts
  window.__analyticsSessionId = sessionId
})
