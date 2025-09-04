// middleware/admin.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  const authStore = useAuthStore()
  
  // Warte auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  // Prüfe Admin-Berechtigung
  if (!authStore.isAdmin) {
    return navigateTo('/dashboard')
  }
})
