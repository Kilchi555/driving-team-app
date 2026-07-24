/**
 * Global fetch interceptor for handling API errors
 * Automatically redirects to login when session expires (401 Unauthorized)
 * Shows user-friendly message instead of confusing error
 */

import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useRoute } from '#app'
import { pathnameIncludesAffiliateDashboard } from '~/utils/affiliate-dashboard-path'
import { logger } from '~/utils/logger'

// Prevent multiple redirects happening at once
let isRedirecting = false

export default defineNuxtPlugin((nuxtApp) => {
  // Lazily-loaded Supabase client reference (populated on first onRequest call).
  let _getSupabase: (() => import('@supabase/supabase-js').SupabaseClient) | null = null

  // Create intercepted fetch instance with cookies enabled
  // CRITICAL: ofetch will use this instance for all API calls
  const interceptedFetch = $fetch.create({
    // Configure ofetch to send cookies with same-origin requests
    // This is critical for httpOnly cookie authentication
    fetchOptions: {
      credentials: 'include' as const // Send cookies with every request
    },
    // Inject Authorization: Bearer from the active Supabase session so that
    // authenticated API calls work even before HTTP-only cookies are synced
    // (e.g. on cold-start of the Capacitor native app).
    onRequest: async ({ options }) => {
      try {
        const rawHeaders = (options as any).headers
        const headers: Record<string, string> = rawHeaders
          ? (typeof (rawHeaders as any).get === 'function'
            ? Object.fromEntries((rawHeaders as Headers).entries())
            : { ...(rawHeaders as object) })
          : {}
        if (!('Authorization' in headers) && !('authorization' in headers)) {
          if (!_getSupabase) {
            const mod = await import('~/utils/supabase')
            _getSupabase = mod.getSupabase
          }
          const { data: { session } } = await _getSupabase().auth.getSession()
          if (session?.access_token) {
            ;(options as any).headers = { ...headers, Authorization: `Bearer ${session.access_token}` }
          }
        }
      } catch { /* non-fatal — fall back to cookie-based auth */ }
    },
    onResponseError: async ({ response, error, request, options }) => {
      const status = response?.status
      // request can be a string (URL) or a Request object — normalize to string
      const url = (typeof request === 'string' ? request : (request as any)?.url || '').toLowerCase()

      const route = useRoute()
      const browserPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const onAffiliateDashboard =
        pathnameIncludesAffiliateDashboard(browserPath) ||
        pathnameIncludesAffiliateDashboard(route.path)

      // Credential probes: wrong/missing cookie or Bearer — never SPA-redirect to tenant login
      const isCredentialProbeEndpoint =
        url.includes('/api/auth/') ||
        url.includes('/api/users/current') ||
        (request as any)?.headers?.['X-Auth-Request'] === 'true'

      if (status === 401 && isCredentialProbeEndpoint) {
        logger.debug('ℹ️ Auth endpoint returned 401 - credential error, let component handle it')
        const d = (response as any)?._data
        throw createError({ statusCode: status, statusMessage: d?.statusMessage || response?.statusText || 'Request failed', data: d?.data ?? d ?? undefined })
      }

      const currentPath = route.path

      // 🚨 CRITICAL: A 401 while there is NO active client session = a login
      // attempt with wrong credentials (or a guest), NOT an expired session.
      // We detect this via the auth store rather than a path blacklist: the old
      // blacklist treated any path outside /customer|/staff|/admin|/booking as a
      // "login page", which wrongly classified authenticated app routes like
      // /upgrade and suppressed the expired-cookie recovery flow below → hard 401.
      let hasActiveSession = false
      try {
        hasActiveSession = useAuthStore().isLoggedIn
      } catch {
        // Auth store not ready yet — treat as no active session.
      }
      if (status === 401 && !hasActiveSession) {
        console.debug('ℹ️ 401 without active session - login/guest attempt, let component handle it')
        const d = (response as any)?._data
        throw createError({ statusCode: status, statusMessage: d?.statusMessage || response?.statusText || 'Request failed', data: d?.data ?? d ?? undefined })
      }
      const isBookingAvailabilityPage = currentPath.includes('/booking/availability/')
      const isBookingFlow = isBookingAvailabilityPage || url.includes('/api/booking/create-appointment') || url.includes('x-booking-flow=true') || (request as any)?.headers?.['X-Booking-Flow'] === 'true'

      // 🚨 If this is a booking flow request, don't redirect - let component handle it
      if (isBookingFlow && status === 401) {
        console.debug('ℹ️ Booking flow 401 - component will show login modal')
        const d = (response as any)?._data
        throw createError({ statusCode: status, statusMessage: d?.statusMessage || response?.statusText || 'Request failed', data: d?.data ?? d ?? undefined })
      }

      // 🛒 Shop page / shop API requests — guest checkout, never redirect to login
      const isShopPage = currentPath.startsWith('/shop')
      const isShopRequest = url.includes('/api/shop/') || url.includes('/api/wallee/') || url.includes('/api/tenants/branding') || url.includes('/api/auth/current-user')
      if ((isShopPage || isShopRequest) && status === 401) {
        console.debug('ℹ️ Shop 401 - guest checkout allowed, no redirect')
        const d = (response as any)?._data
        throw createError({ statusCode: status, statusMessage: d?.statusMessage || response?.statusText || 'Request failed', data: d?.data ?? d ?? undefined })
      }

      // 💳 Stripe checkout/portal — these send an explicit Bearer token. A 401 here must
      // NOT trigger a full-page reload (that loses the checkout intent and feels broken).
      // The calling page (upgrade.vue / billing.vue) handles the 401 by refreshing the
      // token and retrying, or by prompting re-login.
      // Same for course admin actions that retry with refreshClientSession.
      const isStripeRequest = url.includes('/api/stripe/')
      const isCourseAdminRetryable =
        url.includes('/api/courses/send-participant-list')
      if ((isStripeRequest || isCourseAdminRetryable) && status === 401) {
        console.debug('ℹ️ Auth-retryable 401 - letting the page retry/handle it (no reload)')
        const d = (response as any)?._data
        throw createError({ statusCode: status, statusMessage: d?.statusMessage || response?.statusText || 'Request failed', data: d?.data ?? d ?? undefined })
      }

      // Handle 401 - Session expired or invalid token (for non-auth and non-booking endpoints)
      // DON'T redirect for booking flow - let component show modal
      if (status === 401 && !isRedirecting && !isBookingFlow && !onAffiliateDashboard) {
        // Guard immediately so parallel 401s don't each trigger their own toast/redirect
        isRedirecting = true

        // Before triggering a logout, check if the auth store still considers the user logged in.
        // If yes, the HTTP-only cookies may simply be out of sync with the client-side Supabase
        // session (e.g. expired cookie while localStorage session is still valid).
        // Try to re-sync the cookies first; if that works, reload so all requests use the fresh
        // cookies. If the sync itself fails (truly expired session) fall through to logout.
        try {
          const authStore = useAuthStore()
          if (authStore.isLoggedIn) {
            // One-shot guard: only attempt sync+reload once per short window.
            // Without this, a stale Supabase access_token gets re-synced into the
            // cookie, the next request 401s again, and we reload endlessly
            // (~150ms cycles in the native webview where assets load from cache).
            const RELOAD_GUARD_KEY = 'cookie_sync_reload_at'
            const RELOAD_GUARD_WINDOW = 15 * 1000 // 15s
            const lastReloadAt = parseInt(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0', 10)
            const alreadyTriedRecently = Date.now() - lastReloadAt < RELOAD_GUARD_WINDOW

            let synced = false
            if (!alreadyTriedRecently) {
              try {
                const { getSupabase } = await import('~/utils/supabase')
                const supabase = getSupabase()
                const { data: sessionData } = await supabase.auth.getSession()
                if (sessionData?.session) {
                  const syncResult = await $fetch<{
                    success: boolean
                    refreshed?: boolean
                    session?: { access_token: string; refresh_token: string }
                  }>('/api/auth/sync-session', {
                    method: 'POST',
                    body: {
                      access_token: sessionData.session.access_token,
                      refresh_token: sessionData.session.refresh_token
                    }
                  })

                  // If the server had to rotate the refresh token, update the Supabase client
                  // so the browser no longer holds the old (invalidated) refresh token.
                  // Without this, the next sync-session call after reload fails with "already used".
                  if (syncResult?.refreshed && syncResult?.session?.access_token) {
                    try {
                      const { getSupabase } = await import('~/utils/supabase')
                      await getSupabase().auth.setSession({
                        access_token: syncResult.session.access_token,
                        refresh_token: syncResult.session.refresh_token,
                      })
                      console.debug('✅ Supabase client updated with rotated tokens before reload')
                    } catch { /* non-fatal */ }
                  }

                  synced = true
                  sessionStorage.setItem(RELOAD_GUARD_KEY, Date.now().toString())
                  console.debug('✅ Cookie sync succeeded after 401 — reloading page (one-shot)')
                  window.location.reload()
                  return
                }
              } catch (syncErr: any) {
                console.debug('⚠️ Cookie sync failed after 401:', syncErr?.message)
              }
            } else {
              console.debug('🛑 Cookie sync+reload already attempted recently — skipping reload to avoid loop')
            }

            if (!synced) {
              // Sync failed, no Supabase session, or we already tried — the session
              // is truly gone. Fall through to the normal logout + redirect logic.
              console.debug('ℹ️ 401 with active authStore but no successful sync — proceeding to logout')
            }
          }
        } catch (e: any) {
          // If it's a createError we re-throw it, otherwise fall through to logout
          if (e?.statusCode === 401) throw e
        }

        try {
          const authStore = useAuthStore()

          // ✅ CHECK: Sind wir bereits auf einer /{slug} Login-Seite? Dann NICHT redirect!
          // Das verhindert Redirect-Schleifen
          const currentSlug = route.params.slug as string
          if (currentSlug && (currentPath === `/${currentSlug}` || currentPath.startsWith(`/${currentSlug}/`))) {
            console.log('ℹ️ Already on tenant login page - no redirect needed')
            isRedirecting = false
            const d = (response as any)?._data
            throw createError({ statusCode: status, statusMessage: d?.statusMessage || response?.statusText || 'Request failed', data: d?.data ?? d ?? undefined })
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

          // Show user-friendly message — but suppress it if the user just logged in
          // (a 401 right after login means cookie sync is still in progress, not a real expiry)
          try {
            const justLoggedIn = parseInt(sessionStorage.getItem('just_logged_in_at') || '0', 10)
            const isRightAfterLogin = Date.now() - justLoggedIn < 15_000
            if (!isRightAfterLogin) {
              const uiStore = useUIStore()
              uiStore.addNotification({
                type: 'warning',
                title: 'Sitzung abgelaufen',
                message: 'Bitte melden Sie sich erneut an.',
                duration: 5000
              })
            }
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
      // Callers can suppress the toast by setting the X-Silent-Error: true request header
      const reqHeaders = (options as any)?.headers as Record<string, string> | undefined
      const isSilent = reqHeaders?.['x-silent-error'] === 'true' || reqHeaders?.['X-Silent-Error'] === 'true'
      if (status === 403 && !isSilent) {
        console.warn('⚠️ Access denied (403) on:', typeof request === 'string' ? request : (request as any)?.url)
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
      // NOTE: `error` is undefined here — ofetch creates FetchError AFTER onResponseError.
      // Read the parsed response body from response._data instead to preserve all error data.
      const responseData = (response as any)?._data
      throw createError({
        statusCode: status,
        statusMessage: responseData?.message || responseData?.statusMessage || response?.statusText || 'Request failed',
        data: responseData?.data ?? responseData ?? undefined
      })
    }
  })

  // Override nuxtApp.$fetch
  nuxtApp.$fetch = interceptedFetch

  // Also override the global $fetch for direct calls
  globalThis.$fetch = interceptedFetch
})