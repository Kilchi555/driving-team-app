<template>
    <AdminPricingDashboard />
</template>
<script setup>
import AdminPricingDashboard from '~/components/admin/AdminPricingDashboard.vue'
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})
</script>