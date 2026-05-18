// middleware/admin.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

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
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ Admin Middleware - Not logged in, redirecting to /')
    return navigateTo('/')
  }
  
  // Prüfe Admin-Berechtigung
  if (!authStore.isAdmin) {
    logger.debug('❌ Admin Middleware - Not admin, redirecting to /dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Admin Middleware - Access granted')
})
