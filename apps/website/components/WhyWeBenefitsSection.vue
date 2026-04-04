<template>
  <section class="section-container py-16 md:py-24">
    <div class="text-center mb-16">
      <h2 class="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Was wir bieten</h2>
      <div class="w-20 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto"></div>
    </div>

    <div class="grid md:grid-cols-2 gap-8 mb-16">
      <div v-for="(benefit, index) in benefits" :key="index" class="group">
        <div class="flex gap-6 p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-100 hover:border-primary-300 hover:shadow-lg transition duration-300">
          <!-- Icon -->
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
              <span class="text-2xl font-bold text-white">✓</span>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1">
            <h3 class="text-lg md:text-xl font-bold text-gray-900 mb-2">{{ benefit.title }}</h3>
            <p class="text-gray-700 leading-relaxed">{{ benefit.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 rounded-3xl p-8 md:p-12 text-center shadow-xl">
      <p class="text-white text-lg md:text-xl mb-6 font-semibold">Starte jetzt dein Abenteuer und wir begleiten dich auf deinem Weg!</p>
      <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="inline-block bg-white text-primary-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-lg hover:shadow-xl transform hover:scale-105">
        Termin reservieren
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  benefits: {
    type: Array,
    required: true,
    validator: (value: any[]) => {
      return value.every(item => item.title && item.description);
    }
  }
});
</script>

<style scoped>
/* Smooth transitions */
.group {
  transition: all 0.3s ease;
}

.group:hover {
  transform: translateY(-4px);
}
</style>
