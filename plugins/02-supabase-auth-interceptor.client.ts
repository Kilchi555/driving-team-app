/**
 * Supabase Auth Interceptor Plugin
 * 
 * Automatically refreshes authentication tokens before they expire.
 * This ensures users stay logged in with "Remember Me" enabled.
 * 
 * How it works:
 * 1. Restores Supabase session from localStorage on page load
 * 2. Sets up an interval to check token expiry every 30 seconds
 * 3. When token is near expiry (< 5 min remaining), calls refresh API
 * 4. Updates Supabase session with new tokens
 * 5. Keeps user authenticated without re-login
 */

import { defineNuxtPlugin } from '#app'
import { logger } from '~/utils/logger'
import { pathnameIncludesAffiliateDashboard } from '~/utils/affiliate-dashboard-path'
import { isPublicOnlyPath } from '~/utils/public-paths'

const SUPABASE_SESSION_KEY = 'supabase-session-cache'

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

    // Restore session from localStorage (if exists)
    const restoreSessionFromStorage = async () => {
      try {
        const stored = localStorage.getItem(SUPABASE_SESSION_KEY)
        if (!stored) {
          logger.debug('ℹ️ No stored Supabase session in localStorage')
          return
        }

        const { access_token, refresh_token } = JSON.parse(stored)
        if (!access_token || !refresh_token) {
          logger.debug('ℹ️ Stored session missing tokens')
          return
        }

        const supabase = getSupabase()
        if (!supabase) {
          logger.warn('⚠️ Supabase client not available')
          return
        }

        logger.debug('🔄 Restoring Supabase session from localStorage')
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        })

        if (error) {
          logger.warn('⚠️ Failed to restore session:', error.message)
          localStorage.removeItem(SUPABASE_SESSION_KEY)
        } else {
          logger.debug('✅ Supabase session restored from localStorage')
        }
      } catch (err: any) {
        logger.warn('⚠️ Error restoring session:', err.message)
      }
    }

    // Save session to localStorage whenever it changes
    const saveSessionToStorage = async (access_token: string, refresh_token: string) => {
      try {
        localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify({
          access_token,
          refresh_token,
          timestamp: Date.now()
        }))
        logger.debug('💾 Supabase session saved to localStorage')
      } catch (err: any) {
        logger.warn('⚠️ Failed to save session to localStorage:', err.message)
      }
    }

    const startTokenRefreshCheck = async () => {
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

            if (isAffiliateDashboard) {
              // Affiliate: refresh via Supabase client directly (no HTTP-Only cookie)
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              if (!refreshError && refreshData?.session) {
                newAccessToken = refreshData.session.access_token
                newRefreshToken = refreshData.session.refresh_token
                logger.debug('✅ Affiliate token refreshed via supabase.auth.refreshSession()')
              } else {
                logger.warn('⚠️ Affiliate token refresh failed:', refreshError?.message)
              }
            } else {
              // Staff/Client: refresh via HTTP-Only cookie endpoint
              const response = await $fetch('/api/auth/refresh', {
                method: 'POST'
              }) as any
              if (response?.session?.access_token && response?.session?.refresh_token) {
                newAccessToken = response.session.access_token
                newRefreshToken = response.session.refresh_token
              }
            }

            if (newAccessToken && newRefreshToken) {
              logger.debug('✅ Token refreshed successfully')
              
              // Save to localStorage and record refresh time
              await saveSessionToStorage(newAccessToken, newRefreshToken)
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
            if ((err?.response?.status === 401 || err?.statusCode === 401) && !isShopPage && !isAffiliateDashboardCatch) {
              logger.warn('🚪 Refresh token invalid/expired, redirecting to tenant login')
              
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
                localStorage.removeItem(SUPABASE_SESSION_KEY)
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

        // Schedule next check
        if (timeUntilExpiry > 0) {
          refreshCheckInterval = setTimeout(() => {
            startTokenRefreshCheck()
          }, CHECK_INTERVAL)
        } else {
          logger.warn('⚠️ Session already expired')
        }

      } catch (err: any) {
        logger.warn('⚠️ Token refresh check error:', err.message)
      }
    }

    // Restore session from localStorage first
    await restoreSessionFromStorage()

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
