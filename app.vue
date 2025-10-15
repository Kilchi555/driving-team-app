<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { initializeOfflineSupport } from '~/utils/offlineQueue'

// Beim App-Start Offline-Support initialisieren
onMounted(() => {
  // Nur initialisieren wenn window verfügbar ist (client-side)
  if (process.client) {
    initializeOfflineSupport()
  }
})
</script>