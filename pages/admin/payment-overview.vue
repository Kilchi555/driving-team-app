<!-- pages/admin/payment-overview.vue -->
<template>
  <UsersPaymentOverview />
</template>

<script setup>
import UsersPaymentOverview from '~/components/admin/UsersPaymentOverview.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})
</script>