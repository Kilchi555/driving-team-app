<template>
  <AdminExamLocations />
</template>

<script setup lang="ts">
import AdminExamLocations from '~/components/admin/AdminExamLocations.vue'
import { definePageMeta } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})
</script>