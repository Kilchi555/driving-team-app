// plugins/auth-restore.client.ts
// Restores user session from HTTP-Only cookies on page load
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run in browser
  if (!process.client) return

  logger.debug('🔄 Auth restore plugin starting (HTTP-Only cookies)...')

  try {
    const authStore = useAuthStore()
    
    // Only fetch if we don't already have a user (from session-persist plugin)
    if (!authStore.user) {
      logger.debug('🔄 Checking session via API...')
      
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
    } else {
      logger.debug('✅ Session already loaded from cache, skipping API call')
    }
    
    // IMPORTANT: Restore session to Supabase client via setSession
    // This populates sessionStorage with the session data
    // Supabase will use this for client-side queries
    if (authStore.user) {
      try {
        const { getSupabase } = await import('~/utils/supabase')
        const supabase = getSupabase()
        
        // Get current session first to verify it's empty
        const { data: beforeSession } = await supabase.auth.getSession()
        logger.debug('🔐 Session before setSession:', beforeSession?.session ? 'EXISTS' : 'EMPTY')
        
        // Set session with REAL user data from auth response
        // authStore.user.id is the Supabase Auth UID from the HTTP-Only cookie
        const { error } = await supabase.auth.setSession({
          access_token: authStore.user.id, // Use real Supabase Auth ID as token placeholder
          refresh_token: authStore.user.id,
          user: {
            id: authStore.user.id, // REAL Supabase Auth UID
            email: authStore.user.email,
            user_metadata: authStore.user.user_metadata || {},
            app_metadata: {},
            aud: '',
            created_at: new Date().toISOString(),
            confirmation_sent_at: null,
            email_confirmed_at: null,
            phone: '',
            phone_confirmed_at: null,
            identities: [],
            last_sign_in_at: null,
            role: '',
            updated_at: new Date().toISOString()
          }
        })
        
        if (error) {
          logger.debug('⚠️ Error setting Supabase session:', error)
        } else {
          // Verify session was set
          const { data: afterSession } = await supabase.auth.getSession()
          logger.debug('✅ Supabase session set, getSession returns:', afterSession?.session ? 'EXISTS' : 'EMPTY')
          
          // Also check getUser
          const { data: userCheck } = await supabase.auth.getUser()
          logger.debug('✅ getUser returns:', userCheck?.user?.id ? `USER FOUND: ${userCheck.user.id}` : 'USER NULL')
        }
      } catch (err) {
        logger.debug('⚠️ Could not set Supabase session:', err)
      }
      
      logger.debug('✅ Session restored in plugin, role:', authStore.userRole)
    } else {
      logger.debug('⚠️ No user to restore Supabase session')
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
