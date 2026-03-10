/**
 * affiliate-referral.global.ts (website)
 *
 * Runs on every route of the marketing site.
 * If a `?ref=CODE` query param is present, saves it to localStorage
 * so the Booking App can read it during registration.
 * The code is kept for 30 days.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const refCode = to.query.ref as string | undefined
  if (refCode && typeof refCode === 'string' && refCode.length > 0) {
    try {
      const payload = JSON.stringify({
        code: refCode.trim().toUpperCase(),
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      localStorage.setItem('affiliate_ref', payload)
    } catch {
      // localStorage not available (SSR or privacy mode) – silently ignore
    }
  }
})
