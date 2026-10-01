// plugins/01-session-auto-save.client.ts
// Automatically saves session to localStorage when auth store changes
import { defineNuxtPlugin } from '#app'
import { watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'
import { buildPersistentSession, clearAppSessionCache, SESSION_STORAGE_KEY } from '~/utils/session-persistence'

export default defineNuxtPlugin((nuxtApp) => {
  // Only run in browser
  if (!process.client) return

  logger.debug('💾 Session auto-save plugin starting...')

  const authStore = useAuthStore()

  // Watch for user changes and auto-save
  const unwatchUser = watch(
    () => authStore.user,
    (newUser) => {
      if (newUser && authStore.userProfile && authStore.isInitialized) {
        const session = buildPersistentSession({
          user: newUser,
          profile: authStore.userProfile,
        })
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
          logger.debug('💾 Session auto-saved to localStorage')
        } catch (err) {
          logger.debug('⚠️ Could not save session to localStorage:', err)
        }
      } else if (!newUser) {
        // Clear localStorage when user logs out
        clearAppSessionCache(localStorage)
        logger.debug('🗑️ Session cleared from localStorage (logout)')
      }
    }
  )

  // Clean up watcher on app unmount
  nuxtApp.hook('app:unmounted', () => {
    unwatchUser()
  })

  logger.debug('✅ Session auto-save plugin initialized')
})
