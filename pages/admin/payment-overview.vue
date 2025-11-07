<!-- pages/admin/payment-overview.vue -->
<template>
  <UsersPaymentOverview />
</template>

<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import UsersPaymentOverview from '~/components/admin/UsersPaymentOverview.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Auth check
const authStore = useAuthStore()

// Prüfe Authentifizierung direkt in der Komponente
onMounted(async () => {
  console.log('🔍 Payment overview page mounted, checking auth...')
  
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
  
  console.log('✅ Auth check passed, loading payment overview...')
})
</script>