// Tracks SPA page navigation using sendBeacon - zero performance impact
// sendBeacon sends data asynchronously in background, never blocks UI
export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.afterEach((to) => {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return

    navigator.sendBeacon(
      '/api/track',
      JSON.stringify({
        page: to.fullPath,
        referrer: document.referrer,
      })
    )
  })
})
