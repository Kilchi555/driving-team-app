/**
 * Global fetch interceptor for handling API errors
 * Automatically redirects to login when session expires (401 Unauthorized)
 * Shows user-friendly message instead of confusing error
 */

import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'

// Prevent multiple redirects happening at once
let isRedirecting = false

export default defineNuxtPlugin((nuxtApp) => {
  // Create intercepted fetch instance with cookies enabled
  // CRITICAL: ofetch will use this instance for all API calls
  const interceptedFetch = $fetch.create({
    // Configure ofetch to send cookies with same-origin requests
    // This is critical for httpOnly cookie authentication
    fetchOptions: {
      credentials: 'include' as const // Send cookies with every request
    },
    onResponseError: async ({ response, error, request }) => {
      const status = response?.status
      const url = request?.url || ''

      // ✅ FIX: Don't treat login/logout endpoints 401 as session expiry
      // Those are credential errors, not session errors
      const isAuthEndpoint = url.includes('/api/auth/login') || 
                             url.includes('/api/auth/logout') ||
                             url.includes('/api/auth/register') ||
                             url.includes('/api/auth/refresh')

      // 🚨 CRITICAL: If auth endpoint returns 401, it's a credential error - NEVER redirect
      // This prevents users from being redirected to wrong tenants
      if (isAuthEndpoint && status === 401) {
        console.debug('ℹ️ Login/Auth endpoint returned 401 - credential error, not session expiry')
        // Let the error propagate to the component - it will show proper error message
        throw createError({
          statusCode: status,
          statusMessage: response?.statusText || 'Request failed'
        })
      }

      // Handle 401 - Session expired or invalid token (for non-auth endpoints)
      // DON'T redirect for login attempts - 401 is expected when credentials are wrong
      const requestUrl = error.request?.url || error.response?.url || ''
      const isLoginRequest = requestUrl.includes('/api/auth/login')
      
      if (status === 401 && !isRedirecting && !isLoginRequest) {
        isRedirecting = true
        console.warn('⚠️ Session expired (401) - Redirecting to tenant login', { requestUrl, isLoginRequest })

        try {
          const authStore = useAuthStore()
          
          // Get tenant slug before clearing state
          let redirectPath = '/login'
          const tenantId = authStore.userProfile?.tenant_id
          
          // Try to get tenant slug for redirect to /:slug page
          if (tenantId) {
            try {
              const { data: tenant } = await $fetch(`/api/tenants/get-slug?id=${tenantId}`)
              if (tenant?.slug) {
                redirectPath = `/${tenant.slug}`
                console.log('✅ Redirecting to tenant login:', redirectPath)
              }
            } catch (e) {
              console.warn('❌ Could not fetch tenant slug:', e)
              // Fallback: try localStorage
              const lastSlug = localStorage.getItem('last_tenant_slug')
              if (lastSlug) {
                redirectPath = `/${lastSlug}`
                console.log('✅ Using last tenant slug from localStorage:', redirectPath)
              }
            }
          } else {
            // No tenant in profile, try localStorage
            const lastSlug = localStorage.getItem('last_tenant_slug')
            if (lastSlug) {
              redirectPath = `/${lastSlug}`
              console.log('✅ Using last tenant slug from localStorage:', redirectPath)
            }
          }

          // Clear auth state
          authStore.clearAuthState()

          // Show user-friendly message
          try {
            const uiStore = useUIStore()
            uiStore.addNotification({
              type: 'warning',
              title: 'Sitzung abgelaufen',
              message: 'Bitte melden Sie sich erneut an.',
              duration: 5000
            })
          } catch {
            // UI store might not be available
          }

          // Call logout API to clear cookies
          try {
            await $fetch('/api/auth/logout', { method: 'POST' })
          } catch {
            // Ignore logout errors
          }

          // Redirect to tenant login page (/:slug will show login form if not authenticated)
          console.log('🔄 Redirecting to:', redirectPath)
          await navigateTo(redirectPath)
        } finally {
          // Reset flag after a delay to prevent rapid re-triggers
          setTimeout(() => {
            isRedirecting = false
          }, 2000)
        }

        // Don't re-throw - we've handled it gracefully
        return
      }

      // Handle 403 - Forbidden (user doesn't have permission)
      if (status === 403) {
        console.warn('⚠️ Access denied (403)')
        try {
          const uiStore = useUIStore()
          uiStore.addNotification({
            type: 'error',
            title: 'Zugriff verweigert',
            message: 'Sie haben keine Berechtigung für diese Aktion.',
            duration: 5000
          })
        } catch {
          // UI store might not be available
        }
      }

      // Re-throw other errors so callers can handle them
      throw createError({
        statusCode: status,
        statusMessage: response?.statusText || 'Request failed'
      })
    }
  })

  // Override nuxtApp.$fetch
  nuxtApp.$fetch = interceptedFetch

  // Also override the global $fetch for direct calls
  globalThis.$fetch = interceptedFetch
})