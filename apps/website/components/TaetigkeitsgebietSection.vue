<template>
  <section class="section-container">
    <h2 class="heading-md mb-6 text-center">Tätigkeitsgebiet {{ title }}</h2>
    <div class="flex flex-wrap justify-center gap-3">
      <span
        v-for="place in places"
        :key="place"
        class="bg-primary-50 border border-primary-200 rounded-full px-4 py-2 text-sm text-primary-700"
      >📍 {{ place }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  places: string[]
}>()
</script>
