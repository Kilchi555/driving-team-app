// plugins/00-session-persist.client.ts
// Persists user session to localStorage for HMR recovery
import { defineNuxtPlugin } from '#app'
import type { User } from '@supabase/supabase-js'
import { useAuthStore, type UserProfile } from '~/stores/auth'
import { logger } from '~/utils/logger'
import { buildPersistentSession, clearAppSessionCache, sessionRestorePlan, SESSION_STORAGE_KEY, type PersistentSession } from '~/utils/session-persistence'
import { pathnameIncludesAffiliateDashboard } from '~/utils/affiliate-dashboard-path'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run in browser
  if (!process.client) return

  logger.debug('🔐 Session persist plugin starting...')

  const authStore = useAuthStore()

  // Check if we can restore from localStorage first (for HMR recovery)
  const restoreFromLocalStorage = () => {
    try {
      const cached = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!cached) {
        logger.debug('📦 No cached session in localStorage')
        return false
      }

      const session: PersistentSession = JSON.parse(cached)
      const now = Date.now()

      // Check if session is still valid (24 hours)
      if (now - session.timestamp > session.expiresIn) {
        logger.debug('⏰ Cached session expired')
        clearAppSessionCache(localStorage)
        return false
      }

      logger.debug('✅ Restoring session from localStorage (HMR recovery):', session.user.email)
      // Identity only. trialInfo / profile.tenant must not become tenantTrialInfo.
      const restored = sessionRestorePlan(session)
      authStore.user = restored.user as User
      authStore.userProfile = restored.profile as unknown as UserProfile
      authStore.userRole = restored.role

      // Set isInitialized immediately for HMR recovery
      authStore.isInitialized = true
      return true
    } catch (err) {
      logger.debug('⚠️ Error restoring from localStorage:', err)
      clearAppSessionCache(localStorage)
      return false
    }
  }

  // Try to restore from cache first
  const restoredFromCache = restoreFromLocalStorage()

  const affiliatePath =
    typeof window !== 'undefined' && pathnameIncludesAffiliateDashboard(window.location.pathname)

  if (!restoredFromCache) {
    // Affiliate magic-link: no httpOnly cookie — skip noisy current-user 401
    if (affiliatePath) {
      logger.debug('🔄 Affiliate-Dashboard: Session-Persist überspringt Cookie-/current-user')
      authStore.isInitialized = true
    } else {
      // If not in cache, fetch from API (HTTP-Only cookies)
      try {
        logger.debug('🔄 Checking session via API...')
        const response = await $fetch('/api/auth/current-user') as any

        if (response?.user && response?.profile) {
          logger.debug('✅ Session found for:', response.user.email)

          // Store in auth store
          authStore.user = response.user
          authStore.userProfile = response.profile
          authStore.userRole = response.profile.role || ''

          // Live server row from this request. Not copied into the session cache.
          if (response.profile.tenant) {
            authStore.applyServerTenantTrial(response.profile.tenant)
          } else if (response.profile.tenant_id) {
            await authStore.loadTenantTrialInfo()
          }

          const session: PersistentSession = buildPersistentSession({
            user: response.user,
            profile: response.profile,
          })
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
          logger.debug('💾 Session saved to localStorage for HMR recovery')
        } else {
          logger.debug('🔄 No valid session cookie found')
          clearAppSessionCache(localStorage)
        }
      } catch (err: any) {
        logger.debug('⚠️ Session restore error:', err.message)
        clearAppSessionCache(localStorage)
      }

      // Set isInitialized to true even if no session was found
      authStore.isInitialized = true
    }
  }

  logger.debug('✅ Session persist plugin initialized')
})
