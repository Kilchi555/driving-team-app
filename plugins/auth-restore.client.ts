// plugins/auth-restore.client.ts
// Restores user session from HTTP-Only cookies on page load
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'
import { pathnameIncludesAffiliateDashboard } from '~/utils/affiliate-dashboard-path'
import { isPublicOnlyPath } from '~/utils/public-paths'

function isAffiliateDashboardPath(): boolean {
  if (typeof window === 'undefined') return false
  return pathnameIncludesAffiliateDashboard(window.location.pathname)
}

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
        
        if (!authStore.user) {
          authStore.user = userData.user as any
        }

        if (!authStore.userProfile) {
          try {
            await authStore.fetchUserProfile(userData.user.id)
          } catch (err) {
            logger.debug('⚠️ Could not fetch profile (cookie/Bearer):', err)
          }
        }

        // Sync server-side HTTP-only cookies with the current (possibly auto-refreshed)
        // Supabase session so that all /api/* routes can authenticate. Without this step
        // the cookies can silently expire while the client-side localStorage session is
        // still valid — causing every server API call to return 401.
        try {
          const { data: currentSession } = await supabase.auth.getSession()
          if (currentSession?.session) {
            await $fetch('/api/auth/sync-session', {
              method: 'POST',
              body: {
                access_token: currentSession.session.access_token,
                refresh_token: currentSession.session.refresh_token
              }
            })
            logger.debug('✅ Server-side cookies synced with Supabase session')
          }
        } catch (syncErr: any) {
          // Non-fatal: dashboard will catch API 401s and handle accordingly
          logger.debug('⚠️ Cookie sync failed (non-fatal):', syncErr?.message)
        }
        
        logger.debug('✅ Auth restore complete (from Supabase storage)')
        return
      } else {
        logger.debug('⚠️ Supabase session exists but getUser failed:', userError?.message)
      }
    }
    
    // No valid Supabase session - check if we have a user in auth store (from session-persist)
    if (!authStore.user) {
      if (isAffiliateDashboardPath()) {
        logger.debug('🔄 Affiliate-Dashboard: kein Cookie-/current-user Restore ohne Supabase-Session')
      } else if (isPublicOnlyPath(window.location.pathname)) {
        logger.debug('⏭️ Public page – skipping /api/auth/current-user call')
      } else {
        logger.debug('🔄 No user in store, checking via API...')
        
        // Check session via API (tokens are in HTTP-Only cookies)
        const response = await $fetch('/api/auth/current-user') as any
        
        if (response?.user && response?.profile) {
          logger.debug('🔄 Session found for:', response.user.email)
          
          // Set user and profile from API response
          authStore.user = response.user
          authStore.userProfile = response.profile
          authStore.userRole = response.profile.role || ''
          // Sync trial info — prefer server-provided, fallback to dedicated endpoint
          if (response.profile.tenant) {
            authStore.tenantTrialInfo = response.profile.tenant
          } else if (response.profile.tenant_id) {
            await authStore.loadTenantTrialInfo()
          }
        } else {
          logger.debug('🔄 No valid session cookie found')
        }
      }
    }
    
    // If we have a user but no Supabase session, initialize the Supabase client via the
    // httpOnly refresh cookie so that future getSession() calls return a valid session.
    // Without this step, every component's resolveFreshToken() would silently fail and
    // the user would get a 401 on the first API call that requires a Bearer token.
    if (authStore.user && !existingSession?.session) {
      logger.debug('⚠️ User in store but no Supabase session — refreshing via cookie to init client...')
      try {
        const refreshed = await $fetch<{ session: { access_token: string; refresh_token: string; expires_in: number; expires_at: number } }>(
          '/api/auth/refresh',
          { method: 'POST' }
        )
        if (refreshed?.session?.access_token) {
          await supabase.auth.setSession({
            access_token: refreshed.session.access_token,
            refresh_token: refreshed.session.refresh_token,
          })
          logger.debug('✅ Supabase client session initialized from cookie refresh')
        }
      } catch (refreshErr: any) {
        logger.debug('⚠️ Cookie refresh failed during auth restore (user may need to re-login):', refreshErr?.message)
      }
    }

    // Ensure tenantTrialInfo is always loaded — regardless of which restore path was taken.
    // Covers: session-persist sets the user early → auth-restore skips the API call → info stays null.
    if (authStore.user && authStore.userProfile?.tenant_id && !authStore.tenantTrialInfo) {
      logger.debug('🔒 tenantTrialInfo missing — loading via dedicated endpoint...')
      await authStore.loadTenantTrialInfo()
    }
    
  } catch (err: any) {
    if (isAffiliateDashboardPath()) {
      logger.debug('Auth restore: affiliate / keine Cookie-Session', err?.message)
    } else {
      console.error('❌ Auth restore error:', err)
    }
  } finally {
    // Always set isInitialized to true
    const authStore = useAuthStore()
    if (!authStore.isInitialized) {
      authStore.isInitialized = true
      logger.debug('✅ Auth store initialized')
    }
  }
})
