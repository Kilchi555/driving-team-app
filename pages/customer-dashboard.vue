<!-- pages/customer-dashboard.vue -->
<template>
  <CustomerDashboard />
</template>

<script setup>
import CustomerDashboard from '~/components/customer/CustomerDashboard.vue'

// Meta
definePageMeta({
  middleware: 'auth',
  layout: false // Use no layout for clean customer view
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