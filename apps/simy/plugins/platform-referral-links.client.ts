/**
 * Rewrites all app.simy.ch/tenant-register links to include ?ref= from localStorage
 * when the visitor arrived via a platform invite on simy.ch.
 */
import { getStoredPlatformRef, withPlatformRef } from '~/data/pricing'

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const rewrite = () => {
    const ref = getStoredPlatformRef()
    if (!ref) return
    document.querySelectorAll<HTMLAnchorElement>('a[href*="tenant-register"]').forEach((a) => {
      const next = withPlatformRef(a.getAttribute('href') || a.href, ref)
      if (next && next !== a.href) a.href = next
    })
  }

  const schedule = () => {
    rewrite()
    requestAnimationFrame(rewrite)
    setTimeout(rewrite, 300)
    setTimeout(rewrite, 1000)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule)
  } else {
    schedule()
  }

  nuxtApp.hook('page:finish', schedule)

  if (typeof MutationObserver !== 'undefined') {
    const obs = new MutationObserver(() => rewrite())
    const startObs = () => {
      if (document.body) {
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] })
      }
    }
    if (document.body) startObs()
    else document.addEventListener('DOMContentLoaded', startObs)
  }
})
