<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
      <p class="text-gray-500 text-sm">Wird geladen...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo, definePageMeta } from '#imports'

definePageMeta({ layout: false })

onMounted(() => {
  navigateTo('/login')
})
</script>
