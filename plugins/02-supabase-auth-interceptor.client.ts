/**
 * Supabase Auth Interceptor Plugin
 * 
 * Automatically refreshes authentication tokens before they expire.
 * This ensures users stay logged in with "Remember Me" enabled.
 * 
 * How it works:
 * 1. Relies on the Supabase client's own session (module-managed) + httpOnly
 *    cookies to restore auth on page load (see auth-restore.client.ts)
 * 2. Sets up an interval to check token expiry every 30 seconds
 * 3. When token is near expiry (< 5 min remaining), calls refresh API
 * 4. Updates Supabase session with new tokens
 * 5. Keeps user authenticated without re-login
 *
 * SECURITY: this plugin intentionally does NOT persist raw access/refresh
 * tokens to localStorage. httpOnly cookies + the Supabase client's own
 * storage are the auth layers here — anything written to plain localStorage
 * is readable by injected/XSS scripts, which would defeat the point of
 * httpOnly cookies. Only a non-secret timestamp is kept, to pace the
 * proactive refresh interval below.
 */

import { defineNuxtPlugin } from '#app'
import { logger } from '~/utils/logger'
import { pathnameIncludesAffiliateDashboard } from '~/utils/affiliate-dashboard-path'
import { isPublicOnlyPath } from '~/utils/public-paths'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run on client - check both process.client and !process.server
  if (process.client && !process.server) {
    // Skip entirely on public pages – no auth needed, saves 500ms delay + API calls
    if (typeof window !== 'undefined' && isPublicOnlyPath(window.location.pathname)) {
      logger.debug('⏭️ Auth interceptor skipped on public page')
      return
    }

    logger.debug('🔄 Auth Interceptor starting on client')
    
    // Wait a bit for auth to be restored
    await new Promise(resolve => setTimeout(resolve, 500))

    const { getSupabase } = await import('~/utils/supabase')
    const { useAuthStore } = await import('~/stores/auth')
    
    let refreshCheckInterval: any = null
    let isRefreshing = false
    let refreshFailed = false  // set after a permanent 401 – stops all further attempts

    // Session restore on load is handled by auth-restore.client.ts via the
    // Supabase client's own (module-managed) storage + httpOnly cookies —
    // nothing to do here. See the file header for why we don't duplicate
    // tokens into plain localStorage.

    const startTokenRefreshCheck = async () => {
      if (refreshFailed) return

      try {
        const supabase = getSupabase()
        if (!supabase) {
          logger.warn('⚠️ Supabase client not available')
          return
        }

        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.expires_at) {
          logger.debug('ℹ️ No Supabase session - checking again in 30s')
          // No session - probably not logged in yet
          // Schedule next check in 30 seconds
          refreshCheckInterval = setTimeout(() => {
            startTokenRefreshCheck()
          }, 30 * 1000)
          return
        }

        // Check if token is expiring soon (< 5 minutes) OR if we haven't refreshed in a while
        // We refresh proactively every 20 minutes to ensure refresh token stays valid
        const expiresAt = session.expires_at * 1000 // Convert to ms
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now
        const REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes
        const PROACTIVE_REFRESH_INTERVAL = 20 * 60 * 1000 // 20 minutes - proactively refresh before Supabase refresh token expires
        const CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds
        
        // Get last refresh time from session storage
        const lastRefreshTime = parseInt(localStorage.getItem('last_token_refresh_time') || '0', 10)
        const timeSinceLastRefresh = now - lastRefreshTime

        logger.debug('🔍 Token expiry check:', {
          expiresIn: Math.floor(timeUntilExpiry / 1000) + 's',
          timeSinceLastRefresh: Math.floor(timeSinceLastRefresh / 1000) + 's',
          shouldRefresh: timeUntilExpiry < REFRESH_THRESHOLD || timeSinceLastRefresh > PROACTIVE_REFRESH_INTERVAL
        })

        if ((timeUntilExpiry < REFRESH_THRESHOLD || timeSinceLastRefresh > PROACTIVE_REFRESH_INTERVAL) && !isRefreshing) {
          logger.debug('🔄 Token expiring soon, attempting refresh...', {
            expiresIn: Math.floor(timeUntilExpiry / 1000) + 's'
          })

          isRefreshing = true
          try {
            // Affiliates log in via signInWithPassword (Supabase localStorage session, no HTTP-Only cookie).
            // For them, use supabase.auth.refreshSession() directly.
            // For staff/clients, use the cookie-based /api/auth/refresh endpoint.
            const { useRoute } = await import('#app')
            const route = useRoute()
            const isAffiliateDashboard =
              pathnameIncludesAffiliateDashboard(route.path) ||
              (typeof window !== 'undefined' && pathnameIncludesAffiliateDashboard(window.location.pathname))

            let newAccessToken: string | null = null
            let newRefreshToken: string | null = null

            // Prefer refreshing via the Supabase client whenever a localStorage
            // session exists (native app + affiliates log in this way and often
            // have NO sb-refresh-token cookie — the cookie endpoint would 401 in
            // a loop). Only fall back to the cookie endpoint when there is no
            // Supabase session (pure cookie-based staff/client login).
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            if (isAffiliateDashboard || currentSession) {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              if (!refreshError && refreshData?.session) {
                newAccessToken = refreshData.session.access_token
                newRefreshToken = refreshData.session.refresh_token
                logger.debug('✅ Token refreshed via supabase.auth.refreshSession()')

                // Sync the fresh tokens into the server-side HTTP-only cookies
                // (skip for affiliate dashboard — it doesn't use cookies).
                if (!isAffiliateDashboard) {
                  try {
                    await $fetch('/api/auth/sync-session', {
                      method: 'POST',
                      body: { access_token: newAccessToken, refresh_token: newRefreshToken }
                    })
                  } catch (syncErr: any) {
                    logger.debug('⚠️ Cookie sync after refresh failed (non-fatal):', syncErr?.message)
                  }
                }
              } else {
                logger.warn('⚠️ Supabase token refresh failed:', refreshError?.message)
              }
            } else {
              // No Supabase session — refresh via HTTP-Only cookie endpoint.
              // Routed through the shared single-flight helper so this proactive
              // refresher never races other refreshers on the single-use cookie.
              const { refreshClientSession } = await import('~/utils/client-session-refresh')
              const refreshed = await refreshClientSession()
              if (refreshed?.access_token && refreshed?.refresh_token) {
                newAccessToken = refreshed.access_token
                newRefreshToken = refreshed.refresh_token
              }
            }

            if (newAccessToken && newRefreshToken) {
              logger.debug('✅ Token refreshed successfully')
              
              // Record refresh time only (no raw tokens in localStorage — see file header)
              localStorage.setItem('last_token_refresh_time', Date.now().toString())
              
              // Update Supabase session with new tokens (skip for affiliate — already done by refreshSession)
              if (!isAffiliateDashboard) {
                const { error } = await supabase.auth.setSession({
                  access_token: newAccessToken,
                  refresh_token: newRefreshToken
                })
                if (error) {
                  logger.error('❌ Failed to set refreshed session:', error)
                } else {
                  logger.debug('✅ Supabase session updated with new tokens')
                }
              }
            } else {
              logger.warn('⚠️ Refresh response missing tokens')
            }
          } catch (err: any) {
            logger.warn('⚠️ Token refresh failed:', err.message)
            
            // 🛒 Don't redirect for shop page - guest checkout doesn't need auth
            // 🤝 Don't redirect for affiliate dashboard - affiliates use localStorage sessions
            const { useRoute } = await import('#app')
            const route = useRoute()
            const isShopPage = route.path.startsWith('/shop')
            const isAffiliateDashboardCatch =
              pathnameIncludesAffiliateDashboard(route.path) ||
              (typeof window !== 'undefined' && pathnameIncludesAffiliateDashboard(window.location.pathname))

            // If refresh fails due to invalid/expired refresh token, redirect to tenant login
            if ((err?.response?.status === 401 || err?.statusCode === 401 || err?.status === 401) && !isShopPage && !isAffiliateDashboardCatch) {
              logger.warn('🚪 Refresh token invalid/expired, redirecting to tenant login')

              // Stop all further refresh attempts immediately
              refreshFailed = true
              if (refreshCheckInterval) {
                clearTimeout(refreshCheckInterval)
                refreshCheckInterval = null
              }
              
              try {
                const { navigateTo } = await import('#app')
                const authStore = useAuthStore()
                
                let redirectPath = '/login'
                const tenantId = authStore.userProfile?.tenant_id
                
                // Try to get tenant slug for redirect
                if (tenantId) {
                  try {
                    const tenantResponse = await $fetch(`/api/tenants/get-slug?id=${tenantId}`) as any
                    if (tenantResponse?.data?.slug) {
                      redirectPath = `/${tenantResponse.data.slug}`
                    }
                  } catch (e) {
                    // Fallback: try localStorage
                    const lastSlug = localStorage.getItem('last_tenant_slug')
                    if (lastSlug) {
                      redirectPath = `/${lastSlug}`
                    }
                  }
                } else {
                  // No tenant in profile, try localStorage
                  const lastSlug = localStorage.getItem('last_tenant_slug')
                  if (lastSlug) {
                    redirectPath = `/${lastSlug}`
                  }
                }
                
                logger.debug('🔄 Redirecting to tenant login:', redirectPath)
                authStore.clearAuthState()
                await navigateTo(redirectPath)
              } catch (redirectErr: any) {
                logger.error('❌ Failed to redirect:', redirectErr.message)
                // Fallback redirect
                await navigateTo('/login')
              }
            }
            // For other errors (network issues, etc), wait for next check
          } finally {
            isRefreshing = false
          }
        }

        // Schedule next check (skip if a permanent failure already stopped the loop)
        if (!refreshFailed && timeUntilExpiry > 0) {
          refreshCheckInterval = setTimeout(() => {
            startTokenRefreshCheck()
          }, CHECK_INTERVAL)
        } else if (!refreshFailed) {
          logger.warn('⚠️ Session already expired')
        }

      } catch (err: any) {
        logger.warn('⚠️ Token refresh check error:', err.message)
      }
    }

    // Start the refresh check when plugin loads
    logger.debug('🔄 Starting Supabase token refresh interceptor')
    startTokenRefreshCheck()

    // Cleanup on app destroy
    nuxtApp.hook('hook:finalize', () => {
      if (refreshCheckInterval) {
        clearTimeout(refreshCheckInterval)
        logger.debug('🧹 Token refresh interceptor cleaned up')
      }
    })
  }
})
