<script setup lang="ts">
import { useRoute, navigateTo } from '#imports'

const route = useRoute()
const slug = Array.isArray(route.params.slug)
  ? route.params.slug.join('/')
  : route.params.slug

await navigateTo(`https://app.simy.ch/${slug}`, {
  external: true,
  redirectCode: 307,
})
</script>

<template>
  <div></div>
</template>
