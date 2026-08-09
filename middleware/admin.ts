// middleware/admin.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  // Warte auf Router-Initialisierung
  if (!process.client) return
  
  const authStore = useAuthStore()
  
  // Initialisiere sofort wenn Profil noch nicht geladen
  if (!authStore.isInitialized || !authStore.hasProfile) {
    await authStore.initializeAuthStore()
  }

  // Warte auf Auth-Initialisierung UND User-Profil (max. 5s als Fallback)
  let attempts = 0
  while ((!authStore.isInitialized || !authStore.hasProfile) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔐 Admin Middleware - Auth State:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    hasProfile: authStore.hasProfile,
    isAdmin: authStore.isAdmin,
    userRole: authStore.userRole
  })
  
  // Prüfe ob User eingeloggt ist — deep links (z.B. Billing-Mail) mit returnTo erhalten
  if (!authStore.isLoggedIn) {
    const intended = to.fullPath || to.path
    const safeReturnTo = intended.startsWith('/') && !intended.startsWith('//') ? intended : null
    if (safeReturnTo) {
      try {
        sessionStorage.setItem('redirect_after_login', safeReturnTo)
      } catch (e) {
        logger.warn('Could not save redirect destination:', e)
      }
    }

    const withReturnTo = (loginPath: string) => {
      if (!safeReturnTo) return loginPath
      const sep = loginPath.includes('?') ? '&' : '?'
      return `${loginPath}${sep}returnTo=${encodeURIComponent(safeReturnTo)}`
    }

    let lastSlug: string | null = null
    try {
      lastSlug = localStorage.getItem('last_tenant_slug')
    } catch { /* ignore */ }

    logger.debug('❌ Admin Middleware - Not logged in, redirecting to login with returnTo:', safeReturnTo)
    if (lastSlug) return navigateTo(withReturnTo(`/${lastSlug}`))
    return navigateTo(withReturnTo('/login'))
  }
  
  // Prüfe Admin-Berechtigung
  if (!authStore.isAdmin) {
    logger.debug('❌ Admin Middleware - Not admin, redirecting to /dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Admin Middleware - Access granted')
})
