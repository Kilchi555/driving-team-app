<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { initializeOfflineSupport } from '~/utils/offlineQueue'

let appUrlOpenListener: any = null

onMounted(async () => {
  if (process.client) {
    initializeOfflineSupport()

    // Deep Link Handler für Universal Links (Wallee payment callback)
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

      appUrlOpenListener = await App.addListener('appUrlOpen', async (event) => {
        const url = new URL(event.url)

        if (url.pathname.startsWith('/payment-callback')) {
          // Safari ViewController schliessen
          await Browser.close()

          const status = url.searchParams.get('status')
          if (status === 'success') {
            await navigateTo('/customer-dashboard?payment_success=true')
          } else {
            await navigateTo('/customer-dashboard?payment_failed=true')
          }
        }
      })
    }
  }
})

onUnmounted(() => {
  appUrlOpenListener?.remove()
})
</script>