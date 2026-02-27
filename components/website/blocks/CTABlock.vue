<template>
  <section class="py-16 sm:py-24 bg-gradient-to-r from-blue-600 to-blue-800">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="text-4xl font-bold text-white mb-4">{{ content.headline }}</h2>
      <p class="text-xl text-blue-100 mb-8">{{ content.subheadline }}</p>

      <a
        :href="content.cta_url || '/book'"
        class="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition shadow-lg"
      >
        {{ content.cta_text || 'Jetzt Termin buchen' }} →
      </a>

      <p class="text-sm text-blue-100 mt-4">{{ content.footer_text }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  content: any
  tenant: any
}>()
</script>
