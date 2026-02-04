<template>
  <!-- Global Reglement Modal - available on all pages -->
  <ReglementModal
    :is-open="reglementModal.isOpen.value"
    :type="reglementModal.type.value"
    @close="reglementModal.closeReglement"
  />
</template>

<script setup lang="ts">
import { useReglementModal } from '~/composables/useReglementModal'
import ReglementModal from '~/components/customer/ReglementModal.vue'

// Use global reglement modal
const reglementModal = useReglementModal()
</script>
