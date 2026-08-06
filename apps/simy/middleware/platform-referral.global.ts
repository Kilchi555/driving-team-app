/**
 * Stores ?ref= on the marketing site so CTAs to app.simy.ch/tenant-register keep attribution.
 */
import { storePlatformRef } from '~/data/pricing'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const refCode = to.query.ref
  if (typeof refCode !== 'string' || !refCode.trim()) return
  storePlatformRef(refCode)
})
