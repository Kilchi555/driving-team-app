/**
 * Stores ?ref=CODE for both:
 * - client affiliate (affiliate_ref) — validated against affiliate_codes at client signup
 * - platform tenant referral (platform_ref) — validated against platform_referral_codes at tenant register
 *
 * Wrong table = no-op at attribution time.
 */
import { PLATFORM_REF_CLIENT_STORAGE_KEY } from '~/composables/usePlatformRef'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const refCode = to.query.ref as string | undefined
  if (!refCode || typeof refCode !== 'string' || refCode.length === 0) return

  const payload = JSON.stringify({
    code: refCode.trim().toUpperCase(),
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  })

  try {
    localStorage.setItem('affiliate_ref', payload)
    localStorage.setItem(PLATFORM_REF_CLIENT_STORAGE_KEY, payload)
  } catch {
    // localStorage not available
  }
})
