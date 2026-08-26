/**
 * Native push permission + FCM token registration.
 * The iOS/Android system dialog only appears when requestPermissions() runs.
 * That used to wait for supabase.auth.getSession() inside a silent plugin and
 * was skipped whenever the session wasn't ready — so the dialog never showed.
 */

import { navigateTo } from '#app'

let listenersBound = false
let registerStarted = false
let tokenPersisted = false
let permissionAsked = false
let pendingToken: string | null = null
let pendingPlatform = 'ios'
let nativeCached: boolean | null = null

async function resolveAccessToken(): Promise<string | null> {
  const { getSupabase } = await import('~/utils/supabase')
  const { data: { session } } = await getSupabase().auth.getSession()
  if (session?.access_token) return session.access_token
  // Cookie login (staff/admin) often has no supabase-js session yet.
  try {
    const { refreshClientSession } = await import('~/utils/client-session-refresh')
    const refreshed = await refreshClientSession()
    return refreshed?.access_token || null
  } catch {
    return null
  }
}

async function persistPushToken(token: string, platform: string): Promise<boolean> {
  pendingToken = token
  pendingPlatform = platform
  try {
    const accessToken = await resolveAccessToken()
    // Bearer required — cookie-only POST would be CSRF-able from other sites.
    if (!accessToken) return false
    await $fetch('/api/push/register-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { token, platform },
    })
    pendingToken = null
    tokenPersisted = true
    return true
  } catch (e) {
    console.warn('[Push] Token registration failed:', e)
    return false
  }
}

/** Call after login — FCM often fires before Supabase session is ready. */
export async function flushPendingPushToken(): Promise<boolean> {
  if (!pendingToken) return tokenPersisted
  return persistPushToken(pendingToken, pendingPlatform)
}

export async function isCapacitorNative(): Promise<boolean> {
  if (import.meta.server) return false
  if (nativeCached !== null) return nativeCached

  const probe = () => Boolean((window as any).Capacitor?.isNativePlatform?.())
  if (probe()) {
    nativeCached = true
    return true
  }

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      nativeCached = true
      return true
    }
  } catch {
    /* bundle may load before the bridge */
  }

  for (let i = 0; i < 40; i++) {
    if (probe()) {
      nativeCached = true
      return true
    }
    // Safari/Chrome never grow a Capacitor global — don't stall the website.
    if (i >= 3 && !(window as any).Capacitor) {
      nativeCached = false
      return false
    }
    await new Promise(r => setTimeout(r, 50))
  }
  nativeCached = false
  return false
}

async function bindPushListeners() {
  if (listenersBound) return
  listenersBound = true
  const { PushNotifications } = await import('@capacitor/push-notifications')

  await PushNotifications.addListener('registration', async (tokenData) => {
    const platform = (window as any).Capacitor?.getPlatform?.() || 'ios'
    await persistPushToken(tokenData.value, platform)
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
}

export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable'

export async function getNativePushPermission(): Promise<PushPermissionState> {
  if (!(await isCapacitorNative())) return 'unavailable'
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const status = await PushNotifications.checkPermissions()
    if (status.receive === 'granted' || status.receive === 'denied' || status.receive === 'prompt') {
      return status.receive
    }
    return 'prompt'
  } catch (e) {
    console.warn('[Push] checkPermissions failed:', e)
    return 'unavailable'
  }
}

/**
 * Ask the OS for notification permission (shows the system dialog when still
 * undetermined) and register for FCM/APNs. Safe to call multiple times.
 */
export async function ensureNativePushRegistration(opts?: {
  /** When false, only register if already granted. Default true. */
  request?: boolean
}): Promise<PushPermissionState> {
  if (!(await isCapacitorNative())) return 'unavailable'

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await bindPushListeners()

    let status = await PushNotifications.checkPermissions()
    const receive = status.receive

    if (
      opts?.request !== false
      && !permissionAsked
      && receive !== 'granted'
      && receive !== 'denied'
    ) {
      permissionAsked = true
      status = await PushNotifications.requestPermissions()
    }

    if (status.receive !== 'granted') {
      registerStarted = false
      return status.receive === 'denied' ? 'denied' : 'prompt'
    }

    await flushPendingPushToken()
    if (!registerStarted || !tokenPersisted) {
      registerStarted = true
      await PushNotifications.register()
    }
    return 'granted'
  } catch (e) {
    console.warn('[Push] Native register failed:', e)
    registerStarted = false
    return 'unavailable'
  }
}

export async function openNativeNotificationSettings() {
  if (!(await isCapacitorNative())) return
  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.getPlatform() === 'ios') {
    window.location.href = 'app-settings:'
    return
  }
  try {
    const { App } = await import('@capacitor/app')
    await App.openUrl({ url: 'app-settings:' })
  } catch {
    /* Android: user opens Settings → Apps → Simy → Notifications */
  }
}
