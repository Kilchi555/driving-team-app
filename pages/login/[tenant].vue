<template>
  <div />
</template>

<script setup lang="ts">
// Keep layout off to avoid any flicker
definePageMeta({ layout: false })

const route = useRoute()
const tenant = route.params.tenant as string

// Preserve original query string on redirect
const query = route.fullPath.includes('?') ? `?${route.fullPath.split('?')[1]}` : ''
const target = `/${tenant}${query}`

await navigateTo(target, { replace: true, redirectCode: 301 })
</script>
