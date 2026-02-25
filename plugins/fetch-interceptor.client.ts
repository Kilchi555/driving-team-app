/**
 * Global fetch interceptor for handling API errors
 * Automatically redirects to login when session expires (401 Unauthorized)
 * Shows user-friendly message instead of confusing error
 */

import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useRoute } from '#app'

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
      const url = (request?.url || '').toLowerCase()

      // 🚨 CRITICAL: Don't redirect for ANY /api/auth/* endpoints - these are ALWAYS credential errors
      // This includes: login, logout, register, refresh, current-user
      const isAnyAuthEndpoint = url.includes('/api/auth/') || request?.headers?.['X-Auth-Request'] === 'true'
      
      if (status === 401 && isAnyAuthEndpoint) {
        console.debug('ℹ️ Auth endpoint returned 401 - credential error, let component handle it')
        throw createError({
          statusCode: status,
          statusMessage: response?.statusText || 'Request failed'
        })
      }

      // Check if this is a booking flow request (should show modal instead of redirecting)
      const isBookingFlow = url.includes('/api/booking/create-appointment') || url.includes('x-booking-flow=true') || request?.headers?.['X-Booking-Flow'] === 'true'

      // 🚨 If this is a booking flow request, don't redirect - let component handle it
      if (isBookingFlow && status === 401) {
        console.debug('ℹ️ Booking flow 401 - component will show login modal')
        throw createError({
          statusCode: status,
          statusMessage: response?.statusText || 'Request failed'
        })
      }

      // Handle 401 - Session expired or invalid token (for non-auth and non-booking endpoints)
      // DON'T redirect for booking flow - let component show modal
      if (status === 401 && !isRedirecting && !isBookingFlow && !isAnyAuthEndpoint) {
        isRedirecting = true
        console.warn('⚠️ Session expired (401) - Redirecting to tenant login', { url })

        try {
          const authStore = useAuthStore()
          const route = useRoute()
          
          // ✅ CHECK: Sind wir bereits auf einer /{slug} Login-Seite? Dann NICHT redirect!
          // Das verhindert Redirect-Schleifen
          const currentPath = route.path
          const currentSlug = route.params.slug as string
          if (currentSlug && (currentPath === `/${currentSlug}` || currentPath.startsWith(`/${currentSlug}/`))) {
            console.log('ℹ️ Already on tenant login page - no redirect needed')
            isRedirecting = false
            throw createError({
              statusCode: status,
              statusMessage: response?.statusText || 'Request failed'
            })
          }
          
          // IMMER zu tenant-specific login redirecten, NIEMALS zu /login!
          let redirectPath = null
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
            }
          }
          
          // Fallback: try localStorage (ALWAYS required as backup)
          if (!redirectPath) {
            const lastSlug = localStorage.getItem('last_tenant_slug')
            if (lastSlug) {
              redirectPath = `/${lastSlug}`
              console.log('✅ Using last tenant slug from localStorage:', redirectPath)
            }
          }
          
          // If we still don't have a slug, try to extract from current URL or use fallback
          if (!redirectPath) {
            // Try to get from current route if available
            const slugFromRoute = route.params.slug as string
            if (slugFromRoute) {
              redirectPath = `/${slugFromRoute}`
              console.log('✅ Using slug from current route:', redirectPath)
            }
          }
          
          // Last resort: if nothing worked, we have a problem - but we should never reach here
          if (!redirectPath) {
            console.error('❌ No tenant slug found for redirect! This should not happen.')
            redirectPath = '/'
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