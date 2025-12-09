// plugins/auth-init.client.ts
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  // Nur im Browser
  if (!process.client) return

  logger.debug('🚀 Auth init plugin starting...')
  
  try {
    // Setze isInitialized sofort auf true
    const authStore = useAuthStore()
    authStore.isInitialized = true
    
    logger.debug('✅ Auth store initialized immediately')
    logger.debug('🔍 Auth store state:', {
      isInitialized: authStore.isInitialized,
      isLoggedIn: authStore.isLoggedIn,
      hasProfile: authStore.hasProfile
    })
  } catch (error) {
    console.error('❌ Auth init plugin error:', error)
  }
})
