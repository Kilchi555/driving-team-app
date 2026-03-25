export default defineNuxtPlugin(() => {
  const GA_ID = 'G-ZJX01VS6PN'

  window.addEventListener('load', () => {
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    script.async = true
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }
    gtag('js', new Date())
    gtag('config', GA_ID)

    // Track Nuxt page navigation (SPA route changes)
    const router = useRouter()
    router.afterEach((to) => {
      gtag('event', 'page_view', {
        page_path: to.fullPath,
        page_title: document.title,
      })
    })
  })
})
