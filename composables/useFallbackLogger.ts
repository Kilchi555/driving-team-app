// composables/useFallbackLogger.ts
//
// Thin wrapper around the $errorLog.logFallbackUsed() Nuxt plugin
// (plugins/sentry.client.ts) so composables/components don't need to deal
// with useNuxtApp() boilerplate or SSR guards themselves.
//
// Every place in the app that falls back to a hardcoded value instead of
// live tenant data (pricing, category groupings, tenant slug, ...) should
// call this so the fallback shows up in the super-admin "Error Monitoring"
// dashboard (pages/tenant-admin/errors.vue) tagged as `fallback:<source>`.

export const useFallbackLogger = () => {
  const logFallbackUsed = (
    source: string,
    message: string,
    details?: Record<string, any>,
    level: 'warn' | 'error' = 'warn'
  ) => {
    if (!process.client) return
    try {
      const nuxtApp = useNuxtApp()
      nuxtApp.$errorLog?.logFallbackUsed?.(source, message, details, level)
    } catch {
      // Never let logging break the caller
    }
  }

  return { logFallbackUsed }
}
