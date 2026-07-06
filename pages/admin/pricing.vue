<template>
  <div></div>
</template>

<script setup>
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})
import { onMounted } from 'vue'
import { navigateTo } from '#imports'
onMounted(() => navigateTo('/admin/categories', { replace: true }))
</script>
