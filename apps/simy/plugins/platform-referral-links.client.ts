/**
 * Rewrites hardcoded app.simy.ch/tenant-register links to include ?ref= from localStorage
 * when the visitor arrived via a platform invite on simy.ch.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const appendRef = () => {
    let ref: string | null = null
    try {
      const raw = localStorage.getItem('platform_ref')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed?.code || !parsed?.expires || Date.now() > parsed.expires) return
      ref = String(parsed.code).trim().toUpperCase()
    } catch {
      return
    }
    if (!ref) return

    document.querySelectorAll<HTMLAnchorElement>('a[href*="app.simy.ch/tenant-register"]').forEach((a) => {
      try {
        const url = new URL(a.href)
        if (!url.searchParams.has('ref')) {
          url.searchParams.set('ref', ref!)
          a.href = url.toString()
        }
      } catch { /* ignore */ }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendRef)
  } else {
    appendRef()
  }
  // Re-run after client navigations
  setTimeout(appendRef, 500)
})
