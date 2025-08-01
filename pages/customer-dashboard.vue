<!-- pages/customer-dashboard.vue -->
<template>  
  <ClientOnly>
    <CustomerDashboard />
  </ClientOnly>
</template>

<script setup>
import CustomerDashboard from '~/components/customer/CustomerDashboard.vue'

// Meta
definePageMeta({
  middleware: 'auth',
 layout: 'customer',
 ssr: false 
})

// Redirect non-clients to main dashboard
const authStore = useAuthStore()
const { user, userRole, isClient } = storeToRefs(authStore)

watch([user, userRole], ([newUser, newRole]) => {
  if (newUser && !isClient.value) {
    console.log('🔄 User is not a client, redirecting to main dashboard')
    navigateTo('/')
  }
}, { immediate: true })
</script>