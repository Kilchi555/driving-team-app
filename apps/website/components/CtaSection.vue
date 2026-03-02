<template>
  <section class="bg-primary-600 py-16">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <h2 class="text-3xl md:text-4xl font-bold text-white mb-10">{{ title }}</h2>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="https://simy.ch/booking/availability/driving-team"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 bg-white text-gray-900 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition text-lg"
        >
          📅 Termin buchen
        </a>
        <a
          href="https://www.simy.ch/customer/courses/driving-team"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 bg-transparent text-white font-bold px-8 py-4 rounded-lg border-2 border-white hover:bg-white/10 transition text-lg"
        >
          🎓 Kurs buchen
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Jetzt starten!'
})
</script>
