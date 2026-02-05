// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { logger } from '~/utils/logger'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  // Warte auf Router-Initialisierung
  if (!process.client) return
  
  logger.debug('🔐 Auth middleware check:', { path: to.path, name: to.name })
  
  // Skip auth middleware for public pages
  const publicRoutes = [
    '/',
    '/tenant-register',
    '/tenant-start',
    '/tenant-demo',
    '/tenant-test',
    '/tenant-debug',
    '/login',
    '/register',
    '/reset-password'
  ]
  
  // Skip for dynamic routes that are public (like /[slug]/services, /[slug]/register)
  // Also skip the [slug] route itself for public tenant pages
  const isSlugRoute = to.path.match(/^\/[^\/]+$/) && !to.path.startsWith('/admin') && !to.path.startsWith('/staff') && !to.path.startsWith('/customer')
  const isPublicRoute = publicRoutes.includes(to.path) || 
                       to.path.includes('/services') || 
                       to.path.includes('/register') ||
                       to.path.match(/^\/[^\/]+\/(services|register)/) ||
                       to.path.startsWith('/customer/courses') ||
                       isSlugRoute
  
  logger.debug('🔐 Auth middleware:', { isPublicRoute, isSlugRoute, path: to.path })
  
  if (isPublicRoute) {
    logger.debug('🔓 Auth middleware: Skipping public route:', to.path)
    return
  }
  
  const authStore = useAuthStore()
  
  // Initialisiere sofort wenn nicht initialisiert
  if (!authStore.isInitialized) {
    logger.debug('🚀 Auth middleware: Initializing auth store immediately')
    await authStore.initializeAuthStore()
  }
  
  // Kurze Wartezeit für Store-Updates (nur 500ms)
  let attempts = 0
  while (!authStore.isInitialized && attempts < 5) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  // Falls immer noch nicht initialisiert, erzwinge es
  if (!authStore.isInitialized) {
    console.warn('Auth store not initialized after 500ms, forcing initialization')
    await authStore.initializeAuthStore()
  }
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('🚫 Auth middleware: User not logged in, blocking protected route:', to.path)
    logger.debug('Auth middleware: AuthStore state:', {
      isLoggedIn: authStore.isLoggedIn,
      isInitialized: authStore.isInitialized,
      hasProfile: authStore.hasProfile,
      user: authStore.user ? 'PRESENT' : 'NULL'
    })
    
  // ✅ Block protected routes (dashboard, staff, admin, customer)
    if (to.path.startsWith('/dashboard') || 
        to.path.startsWith('/staff/') || 
        to.path.startsWith('/admin/') || 
        to.path.startsWith('/customer/')) {
      logger.debug('🔒 Auth middleware: Blocking protected route, need tenant login:', to.path)
      
      // Try to save the intended destination
      try {
        sessionStorage.setItem('redirect_after_login', to.path)
      } catch (e) {
        logger.warn('Could not save redirect destination:', e)
      }
      
      // Try to get tenant slug for redirect to tenant login page
      let lastSlug = null
      try {
        lastSlug = localStorage.getItem('last_tenant_slug')
      } catch (e) {
        logger.warn('Could not read localStorage:', e)
      }
      
      if (lastSlug) {
        logger.debug('🔄 Redirecting to tenant login:', `/${lastSlug}`)
        return navigateTo(`/${lastSlug}`)
      }
      
      // Fallback to generic login
      logger.debug('🔄 No tenant slug found, redirecting to generic login')
      return navigateTo('/login')
    }
    
    // WICHTIG: Nicht umleiten wenn wir gerade von /login oder /driving-team kommen!
    // Das würde eine Endlosschleife verursachen
    if (from.path === '/login' || from.path.match(/^\/[^\/]+$/)) {
      logger.debug('Auth middleware: Coming from login page, allowing through to prevent loop')
      return
    }
    
    // ✅ Fallback: Try to redirect to last tenant slug instead of generic /login
    logger.debug('Auth middleware: User not logged in, need to redirect to tenant login')
    
    // Extract slug from current path if available
    const slugMatch = to.path.match(/^\/([^\/]+)/)
    if (slugMatch && slugMatch[1]) {
      const slug = slugMatch[1]
      logger.debug('Auth middleware: Found slug in path:', `/${slug}`)
      return navigateTo(`/${slug}`)
    }
    
    // Try to get last tenant slug from localStorage
    let lastTenantSlug: string | null = null
    if (process.client) {
      try {
        lastTenantSlug = localStorage.getItem('last_tenant_slug')
        if (lastTenantSlug) {
          logger.debug('Auth middleware: Found last tenant slug in localStorage:', lastTenantSlug)
          return navigateTo(`/${lastTenantSlug}`)
        }
      } catch (e) {
        logger.warn('Auth middleware: Could not read localStorage:', e)
      }
    }
    
    // Fallback: Leite zum Login weiter
    logger.debug('Auth middleware: No tenant slug found, redirecting to generic login')
    return navigateTo('/login')
  }
  
  logger.debug('✅ Auth middleware: User is logged in, allowing access to:', to.path)
})