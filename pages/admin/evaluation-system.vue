<template>
  <div class="p-3 sm:p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Bewertungssystem</h1>
      <p class="text-gray-600">Verwalten Sie Kategorien, Kriterien und Bewertungsskala</p>
    </div>

    <EvaluationSystemManagerInline />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import EvaluationSystemManagerInline from '~/components/admin/EvaluationSystemManagerInline.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Auth check
const authStore = useAuthStore()

onMounted(async () => {
  logger.debug('🔍 Evaluation system page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, evaluation system page ready')
})
</script>
