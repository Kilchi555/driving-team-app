<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
await navigateTo('/admin/website/editor', { replace: true })
</script>

<template>
  <div class="p-8 text-center text-gray-500">Weiter zum Editor…</div>
</template>
