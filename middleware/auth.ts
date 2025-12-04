// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  // Warte auf Router-Initialisierung
  if (!process.client) return
  
  console.log('🔐 Auth middleware check:', { path: to.path, name: to.name })
  
  // Skip auth middleware for public pages
  const publicRoutes = [
    '/',
    '/auswahl',
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
  
  console.log('🔐 Auth middleware:', { isPublicRoute, isSlugRoute })
  
  if (isPublicRoute) {
    console.log('🔓 Auth middleware: Skipping public route:', to.path)
    return
  }
  
  const authStore = useAuthStore()
  
  // Initialisiere sofort wenn nicht initialisiert
  if (!authStore.isInitialized) {
    console.log('🚀 Auth middleware: Initializing auth store immediately')
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
    console.log('Auth middleware: User not logged in, isInitialized:', authStore.isInitialized)
    console.log('Auth middleware: AuthStore state:', {
      isLoggedIn: authStore.isLoggedIn,
      isInitialized: authStore.isInitialized,
      hasProfile: authStore.hasProfile
    })
    
    // Für Admin-Seiten, leite zur Dashboard weiter statt zur Hauptseite
    if (to.path.startsWith('/admin/')) {
      console.log('Auth middleware: Redirecting admin page to dashboard')
      return navigateTo('/dashboard')
    }
    
    if (to.path !== '/') {
      return navigateTo('/')
    }
    return
  }
})