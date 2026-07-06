<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <VehicleRentalsAdmin />
  </div>
</template>

<script setup lang="ts">
import VehicleRentalsAdmin from '~/components/admin/VehicleRentalsAdmin.vue'
definePageMeta({ layout: 'admin', middleware: 'admin' })
</script>
