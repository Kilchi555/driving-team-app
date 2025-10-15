// plugins/auth-init.client.ts
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  // Nur im Browser
  if (!process.client) return

  console.log('🚀 Auth init plugin starting...')
  
  try {
    // Setze isInitialized sofort auf true
    const authStore = useAuthStore()
    authStore.isInitialized = true
    
    console.log('✅ Auth store initialized immediately')
    console.log('🔍 Auth store state:', {
      isInitialized: authStore.isInitialized,
      isLoggedIn: authStore.isLoggedIn,
      hasProfile: authStore.hasProfile
    })
  } catch (error) {
    console.error('❌ Auth init plugin error:', error)
  }
})
