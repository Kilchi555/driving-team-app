<!-- layouts/default.vue -->
<template>
  <div>
    <slot />
    <GlobalNotifications />
  </div>
</template>

<script setup>
import GlobalNotifications from '~/components/GlobalNotifications.vue'
</script>