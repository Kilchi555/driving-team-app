/**
 * Nuxt client plugin — sets up Capacitor Push Notifications.
 * Runs only in the native app (iOS / Android); silently skips in the browser.
 *
 * Flow:
 *  1. Check / request permission
 *  2. Register with FCM / APNs → receive device token
 *  3. POST token to /api/push/register-token (authenticated)
 *  4. Listen for incoming notifications and taps
 */

import { defineNuxtPlugin, navigateTo, useSupabaseClient } from '#imports'

export default defineNuxtPlugin(async () => {
  if (process.server) return
  if (!(window as any).Capacitor?.isNativePlatform?.()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // ── 1. Permission ─────────────────────────────────────────────────────────
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }
    if (permStatus.receive !== 'granted') {
      console.info('[Push] Permission not granted, skipping registration.')
      return
    }

    // ── 2. Register with platform push service ────────────────────────────────
    await PushNotifications.register()

    // ── 3. Token received → save to backend ──────────────────────────────────
    await PushNotifications.addListener('registration', async (tokenData) => {
      try {
        const supabase = useSupabaseClient()
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

    // ── 4. Registration error ─────────────────────────────────────────────────
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', JSON.stringify(err))
    })

    // ── 5. Foreground notification (show as in-app banner via console for now) ─
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.info('[Push] Foreground notification:', notification.title)
    })

    // ── 6. Notification tap → navigate if data.path is provided ──────────────
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const path = action.notification.data?.path as string | undefined
      if (path) navigateTo(path)
    })
  } catch (e) {
    console.warn('[Push] Setup failed:', e)
  }
})
