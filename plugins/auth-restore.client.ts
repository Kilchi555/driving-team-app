// plugins/auth-restore.client.ts
// Restores user session from HTTP-Only cookies on page load
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run in browser
  if (!process.client) return

  logger.debug('🔄 Auth restore plugin starting...')

  try {
    const authStore = useAuthStore()
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    
    // FIRST: Check if Supabase already has a valid session (from its own localStorage)
    const { data: existingSession } = await supabase.auth.getSession()
    
    if (existingSession?.session) {
      logger.debug('✅ Supabase session found in storage, validating...')
      
      // Verify the session is still valid by checking getUser
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userData?.user && !userError) {
        logger.debug('✅ Supabase session is valid for:', userData.user.email)
        
        // Update auth store if needed
        if (!authStore.user) {
          authStore.user = userData.user as any
          
          // Fetch profile if needed
          if (!authStore.userProfile) {
            try {
              const response = await $fetch('/api/auth/current-user') as any
              if (response?.profile) {
                authStore.userProfile = response.profile
                authStore.userRole = response.profile.role || ''
              }
            } catch (err) {
              logger.debug('⚠️ Could not fetch profile:', err)
            }
          }
        }
        
        logger.debug('✅ Auth restore complete (from Supabase storage)')
        return
      } else {
        logger.debug('⚠️ Supabase session exists but getUser failed:', userError?.message)
      }
    }
    
    // No valid Supabase session - check if we have a user in auth store (from session-persist)
    if (!authStore.user) {
      logger.debug('🔄 No user in store, checking via API...')
      
      // Check session via API (tokens are in HTTP-Only cookies)
      const response = await $fetch('/api/auth/current-user') as any
      
      if (response?.user && response?.profile) {
        logger.debug('🔄 Session found for:', response.user.email)
        
        // Set user and profile from API response
        authStore.user = response.user
        authStore.userProfile = response.profile
        authStore.userRole = response.profile.role || ''
      } else {
        logger.debug('🔄 No valid session cookie found')
      }
    }
    
    // If we have a user but no Supabase session, we need to get fresh tokens
    // This happens when Supabase localStorage was cleared but HTTP-Only cookies are still valid
    if (authStore.user && !existingSession?.session) {
      logger.debug('⚠️ User in store but no Supabase session - tokens needed from server')
      // The user will need to re-login to get fresh tokens
      // HTTP-Only cookies can authenticate API calls, but not client Supabase calls
    }
    
  } catch (err: any) {
    console.error('❌ Auth restore error:', err)
  } finally {
    // Always set isInitialized to true
    const authStore = useAuthStore()
    if (!authStore.isInitialized) {
      authStore.isInitialized = true
      logger.debug('✅ Auth store initialized')
    }
  }
})
