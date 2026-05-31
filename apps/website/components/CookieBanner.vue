<template>
  <Transition name="cookie-slide">
    <div
      v-if="visible"
      class="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl"
      role="dialog"
      aria-label="Cookie-Einstellungen"
    >
      <div class="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="flex-1 text-sm text-gray-200 leading-relaxed">
          <span class="text-lg mr-2">🍪</span>
          Wir verwenden Google Analytics und Meta Pixel, um unsere Website zu verbessern und relevante Werbung auszuspielen.
          Ihre Daten werden anonymisiert verarbeitet.
          <a href="/datenschutz/" class="underline text-primary-300 hover:text-white ml-1">Datenschutz</a>
        </div>
        <div class="flex gap-3 flex-shrink-0">
          <button
            @click="decline"
            class="px-4 py-2 text-sm border border-gray-500 rounded-lg text-gray-300 hover:border-gray-300 hover:text-white transition"
          >
            Ablehnen
          </button>
          <button
            @click="accept"
            class="px-4 py-2 text-sm bg-primary-700 hover:bg-primary-600 text-white rounded-lg font-medium transition"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const STORAGE_KEY = 'dt_cookie_consent'
const config = useRuntimeConfig()

// Single GA4 init path – nuxt-gtag has enabled:false, we call initialize() here after consent
const { initialize: initGtag, gtag } = useGtag()

const visible = ref(false)

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    setTimeout(() => { visible.value = true }, 800)
  }
  if (stored === 'accepted') {
    enableAnalytics()
    loadMetaPixel()
  }
})

function accept() {
  localStorage.setItem(STORAGE_KEY, 'accepted')
  visible.value = false
  enableAnalytics()
  loadMetaPixel()
}

function decline() {
  localStorage.setItem(STORAGE_KEY, 'declined')
  visible.value = false
}

function enableAnalytics() {
  // Grant consent and initialize GA4 via nuxt-gtag (single instance, correct Measurement ID)
  gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
  })
  initGtag()
}

function loadMetaPixel() {
  const pixelId = config.public.metaPixelId
  if (!pixelId || (window as any).fbq) return

  ;(function(w: any) {
    if (w.fbq) return
    const n: any = w.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!w._fbq) w._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = document.createElement('script')
    t.async = true
    t.src = 'https://connect.facebook.net/en_US/fbevents.js'
    const s = document.getElementsByTagName('script')[0]
    s.parentNode?.insertBefore(t, s)
  })(window)

  ;(window as any).fbq('init', pixelId)
  ;(window as any).fbq('track', 'PageView')
}
</script>

<style scoped>
.cookie-slide-enter-active,
.cookie-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.cookie-slide-enter-from,
.cookie-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
