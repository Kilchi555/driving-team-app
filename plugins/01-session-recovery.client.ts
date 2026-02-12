/**
 * Session Recovery Plugin
 * 
 * On app initialization (browser opens/reload):
 * 1. Check if we have a valid session
 * 2. If valid: Load user data and refresh page silently
 * 3. If invalid: Redirect to login (unless on public page)
 * 
 * This ensures that after browser reload, users get:
 * - Their latest data
 * - No "session expired" errors
 * - Automatic redirect to login if session lost
 */

import { useAuthStore } from '~/stores/auth'
import { useRouter, useRoute } from '#app'
import { logger } from '~/utils/logger'

// Pages that don't require authentication
const PUBLIC_PAGES = [
  '/login',
  '/register',
  '/reset-password',
  '/booking',
  '/booking/',
  '/privacy',
  '/terms',
  '/contact',
]

export default defineNuxtPlugin(async (nuxtApp) => {
  // ✅ Only run on client side
  if (process.server) return

  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()

  logger.debug('🔄 Session Recovery Plugin initializing...', {
    currentPath: route.path,
    hasUser: !!authStore.user,
  })

  // If user is already loaded, no need to recover
  if (authStore.user) {
    logger.debug('✅ User already loaded, session OK')
    return
  }

  // Check if current page is public
  const isPublicPage = PUBLIC_PAGES.some((page) =>
    route.path.startsWith(page)
  )

  logger.debug('🔍 Session Recovery Check:', {
    isPublicPage,
    path: route.path,
  })

  try {
    // Try to get current user (will validate session)
    logger.debug('📡 Attempting to recover session...')
    const response = await $fetch('/api/auth/current-user', {
      method: 'GET',
    }) as any

    if (response?.user) {
      logger.info('✅ Session recovered successfully!', {
        userId: response.user.id,
        email: response.user.email,
      })

      // Update auth store with recovered user
      authStore.setUser(response.user)
      authStore.setProfile(response.profile)
      authStore.setAuthenticated(true)

      // Refresh page data to ensure everything is up to date
      logger.debug('🔄 Refreshing page data after session recovery...')
      // Give the app a moment to process the auth state
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Reload page to fetch latest data
      // This ensures all components get fresh data
      window.location.reload()
      return
    }
  } catch (error: any) {
    logger.debug('⚠️ Session recovery failed:', {
      status: error.status,
      message: error.message,
      path: route.path,
    })

    // If session is invalid and user is on protected page, redirect to login
    if (!isPublicPage) {
      logger.warn('🔐 No valid session on protected page, redirecting to login...', {
        fromPage: route.path,
      })

      // Redirect to login
      await router.push({
        path: '/login',
        query: route.path !== '/' ? { redirect: route.path } : {},
      })
      return
    }

    // Public page without session - no action needed
    logger.debug('✅ Public page without session - OK')
  }

  logger.debug('✅ Session recovery plugin completed')
})
