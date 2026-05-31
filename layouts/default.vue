<!-- layouts/default.vue -->
<template>
  <div>
    <slot />
    <GlobalNotifications />
  </div>
</template>

<script setup>
import GlobalNotifications from '~/components/GlobalNotifications.vue'
import { useStatusBar } from '~/composables/useStatusBar'

// Default-Layout-Seiten haben i.d.R. einen hellen Hintergrund → dunkler Status-Bar-Text.
// Verhindert, dass weißer Text einer vorherigen farbigen Seite (z.B. Dashboard) bestehen bleibt.
useStatusBar({
  backgroundColor: '#ffffff',
  style: 'dark'
})
</script>