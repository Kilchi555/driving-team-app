<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
      <p class="text-gray-500 text-sm">Wird geladen...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'

definePageMeta({ layout: false })

onMounted(() => {
  if (!Capacitor.isNativePlatform()) {
    // Web visitors land on app.simy.ch / → go to simy.ch marketing page
    window.location.replace('https://simy.ch')
  } else {
    // Native app users → go to login
    navigateTo('/login')
  }
})
</script>
