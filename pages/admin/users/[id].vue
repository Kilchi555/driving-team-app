<template>
  <UserDetails />
</template>

<script setup lang="ts">
import UserDetails from '~/components/admin/UserDetails.vue'
import { definePageMeta } from '#imports';

// Page Meta für Admin-Layout
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})
</script>