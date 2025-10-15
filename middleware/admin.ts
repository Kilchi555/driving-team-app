// middleware/admin.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  // Warte auf Router-Initialisierung
  if (!process.client) return
  
  const authStore = useAuthStore()
  
  // Warte auf Auth-Initialisierung UND User-Profil
  let attempts = 0
  while ((!authStore.isInitialized.value || !authStore.hasProfile.value) && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔐 Admin Middleware - Auth State:', {
    isInitialized: authStore.isInitialized.value,
    isLoggedIn: authStore.isLoggedIn.value,
    hasProfile: authStore.hasProfile.value,
    isAdmin: authStore.isAdmin.value,
    userRole: authStore.userRole.value
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn.value) {
    console.log('❌ Admin Middleware - Not logged in, redirecting to /')
    return navigateTo('/')
  }
  
  // Prüfe Admin-Berechtigung (setup store getters are refs)
  if (!authStore.isAdmin.value) {
    console.log('❌ Admin Middleware - Not admin, redirecting to /dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Admin Middleware - Access granted')
})
