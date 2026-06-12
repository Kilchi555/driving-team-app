<template>
  <Transition name="cookie-slide">
    <div
      v-if="visible"
      class="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white"
      role="dialog"
      aria-label="Cookie-Einstellungen"
    >
      <div class="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p class="flex-1 text-sm text-gray-300 leading-relaxed">
          Wir verwenden Google Analytics, um unsere Website zu verbessern. Daten werden anonymisiert verarbeitet und auf Schweizer Servern gespeichert.
          <a href="/datenschutz" class="underline text-white ml-1 hover:opacity-80 transition-opacity">Datenschutz</a>
        </p>
        <div class="flex gap-3 flex-shrink-0">
          <button
            @click="decline"
            class="px-4 py-2 text-sm border border-gray-500 rounded-lg text-gray-300 hover:border-gray-300 hover:text-white transition-colors"
          >
            Ablehnen
          </button>
          <button
            @click="accept"
            class="px-4 py-2 text-sm rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
            style="background: var(--brand-primary, #6000BD)"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
declare const window: Window & { gtag?: (...args: unknown[]) => void }

const STORAGE_KEY = 'simy_cookie_consent'

const visible = ref(false)

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    setTimeout(() => { visible.value = true }, 900)
  }
  if (stored === 'accepted') {
    enableAnalytics()
  }
})

function accept() {
  localStorage.setItem(STORAGE_KEY, 'accepted')
  visible.value = false
  enableAnalytics()
}

function decline() {
  localStorage.setItem(STORAGE_KEY, 'declined')
  visible.value = false
}

function enableAnalytics() {
  // GA4 script is always loaded (injected in nuxt.config.ts head).
  // We only need to update consent so GA4 starts sending data.
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
    })
  }
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
