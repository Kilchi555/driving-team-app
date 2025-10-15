<template>
  <UserPaymentDetails />
</template>

<script setup lang="ts">
import UserPaymentDetails from '~/components/admin/UserPaymentDetails.vue'
import { definePageMeta } from '#imports'

// Page Meta für Admin-Layout
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})
</script>

