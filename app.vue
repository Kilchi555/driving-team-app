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
  initializeOfflineSupport()
})
</script>