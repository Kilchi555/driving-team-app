<template>
  <div class="site-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Minimal public layout for generated tenant landing pages (fast SSR).
</script>

<style src="~/assets/css/website-landing-nav.css"></style>

<style>
.site-root {
  min-height: 100vh;
  background: #fff;
}
</style>
