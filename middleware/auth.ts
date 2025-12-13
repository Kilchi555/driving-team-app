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
                       isSlugRoute
  
  logger.debug('🔐 Auth middleware:', { isPublicRoute, isSlugRoute })
  
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
    logger.debug('Auth middleware: User not logged in, isInitialized:', authStore.isInitialized)
    logger.debug('Auth middleware: AuthStore state:', {
      isLoggedIn: authStore.isLoggedIn,
      isInitialized: authStore.isInitialized,
      hasProfile: authStore.hasProfile
    })
    
    // Für Admin-Seiten, leite zur Dashboard weiter statt zur Hauptseite
    if (to.path.startsWith('/admin/')) {
      logger.debug('Auth middleware: Redirecting admin page to dashboard')
      return navigateTo('/dashboard')
    }
    
    // WICHTIG: Nicht umleiten wenn wir gerade von /login oder /driving-team kommen!
    // Das würde eine Endlosschleife verursachen
    if (from.path === '/login' || from.path.match(/^\/[^\/]+$/)) {
      logger.debug('Auth middleware: Coming from login page, allowing through to prevent loop')
      return
    }
    
    // ✅ NEU: Versuche zur Slug-Route weiterzuleiten, ansonsten zum Login
    // Extract slug from current path if available
    const slugMatch = to.path.match(/^\/([^\/]+)/)
    const systemRoutes = ['mfa', 'login', 'auth', 'register', 'onboarding', 'admin', 'tenant-admin', 'dashboard']
    
    if (slugMatch && slugMatch[1] && !systemRoutes.includes(slugMatch[1])) {
      const slug = slugMatch[1]
      logger.debug('Auth middleware: Redirecting to slug route:', `/${slug}`)
      return navigateTo(`/${slug}`)
    }
    
    // Fallback: Leite zum Login weiter
    logger.debug('Auth middleware: No valid slug found, redirecting to login')
    return navigateTo('/login')
  }
})