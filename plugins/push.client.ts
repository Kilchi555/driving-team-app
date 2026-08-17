/**
 * Nuxt client plugin — sets up Capacitor Push Notifications.
 * Runs only in the native app (iOS / Android); silently skips in the browser.
 *
 * Do not register FCM on cold start. Without google-services.json,
 * PushNotifications.register() kills the Android process. Play reviewers
 * also never get past the login screen, so permission prompts belong after auth.
 *
 * Flow:
 *  1. Attach listeners
 *  2. After a session exists: request permission + register with FCM / APNs
 *  3. POST token to /api/push/register-token (authenticated)
 *  4. Handle incoming notifications and taps
 */

import { defineNuxtPlugin, navigateTo } from '#imports'

export default defineNuxtPlugin(async () => {
  if (process.server) return
  if (!(window as any).Capacitor?.isNativePlatform?.()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const supabase = useSupabaseClient()
    let registered = false

    await PushNotifications.addListener('registration', async (tokenData) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        await $fetch('/api/push/register-token', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            token: tokenData.value,
            platform: (window as any).Capacitor.getPlatform() as 'ios' | 'android',
          },
        })
      } catch (e) {
        console.warn('[Push] Token registration failed:', e)
      }
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', JSON.stringify(err))
    })

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.info('[Push] Foreground notification:', notification.title)
    })

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const path = action.notification.data?.path as string | undefined
      if (
        typeof path === 'string'
        && path.startsWith('/')
        && !path.startsWith('//')
        && !path.includes('://')
      ) {
        navigateTo(path)
      }
    })

    const registerIfAllowed = async () => {
      if (registered) return
      try {
        let permStatus = await PushNotifications.checkPermissions()
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions()
        }
        if (permStatus.receive !== 'granted') {
          console.info('[Push] Permission not granted, skipping registration.')
          return
        }
        await PushNotifications.register()
        registered = true
      } catch (e) {
        console.warn('[Push] Native register failed (Firebase missing?):', e)
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) await registerIfAllowed()

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) registerIfAllowed()
    })
  } catch (e) {
    console.warn('[Push] Setup failed:', e)
  }
})
