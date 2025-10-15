<template>
  <div>
    <AdminLayout>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Bewertungssystem</h1>
            <p class="text-gray-600">Verwalten Sie Kategorien, Kriterien und Bewertungsskala</p>
          </div>
        </div>
      </template>

      <EvaluationSystemManagerInline />
    </AdminLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import EvaluationSystemManagerInline from '~/components/admin/EvaluationSystemManagerInline.vue'

// @ts-ignore
definePageMeta({
  layout: 'admin',
  middleware: 'features'
})

// Auth check
const authStore = useAuthStore()

onMounted(async () => {
  console.log('🔍 Evaluation system page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    console.log('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Auth check passed, evaluation system page ready')
})
</script>
