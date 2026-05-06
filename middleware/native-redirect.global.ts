// middleware/native-redirect.global.ts
// In the native (Capacitor) app, the root path "/" should always show the
// generic Simy login. Tenant context is derived from the user's profile after
// login — there is no public tenant selection in the app. Registration is
// invitation-only via onboarding link.
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  if (to.path !== '/') return

  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  if (!isNative) return

  return navigateTo('/login', { replace: true })
})
