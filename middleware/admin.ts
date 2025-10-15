// middleware/admin.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  // Warte auf Router-Initialisierung
  if (!process.client) return
  
  const authStore = useAuthStore()
  
  // Warte auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized.value && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn.value) {
    return navigateTo('/')
  }
  
  // Prüfe Admin-Berechtigung (setup store getters are refs)
  if (!authStore.isAdmin.value) {
    return navigateTo('/dashboard')
  }
})
