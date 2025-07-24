// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  const authStore = useAuthStore()
  
  // Warte kurz auf Store-Initialisierung oder bis Auth-Daten vorhanden sind
  let attempts = 0
  while (!authStore.isInitialized && !authStore.isLoggedIn && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  // Wenn Auth-Daten vorhanden sind, aber isInitialized fehlt, setze es manuell
  if (authStore.isLoggedIn && !authStore.isInitialized) {
    authStore.isInitialized = true
  }
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    if (to.path !== '/') {
      return navigateTo('/')
    }
    return
  }
  
  // Prüfe ob User ein Profil hat
  if (!authStore.hasProfile && to.path !== '/profile-setup') {
    return navigateTo('/profile-setup')
  }
  
  // Wenn User Profil hat aber auf Setup-Seite ist
  if (authStore.hasProfile && to.path === '/profile-setup') {
    return navigateTo('/dashboard')
  }
})