<!-- layouts/customer.vue -->
<template>
  <div>
    <slot />
    <!-- Global Reglement Modal -->
    <GlobalReglementModal />
  </div>
</template>

<script setup lang="ts">
import GlobalReglementModal from '~/components/global/GlobalReglementModal.vue'
</script>