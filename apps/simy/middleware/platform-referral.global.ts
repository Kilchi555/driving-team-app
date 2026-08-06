/**
 * Stores ?ref= on the marketing site so CTAs to app.simy.ch/tenant-register can append it.
 * Also sets platform_ref for same-origin flows.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const refCode = to.query.ref as string | undefined
  if (!refCode || typeof refCode !== 'string' || !refCode.trim()) return

  const payload = JSON.stringify({
    code: refCode.trim().toUpperCase(),
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })

  try {
    localStorage.setItem('platform_ref', payload)
    localStorage.setItem('affiliate_ref', payload)
  } catch {
    // ignore
  }
})
