<!-- pages/customer/coming-soon.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
    <div class="max-w-2xl w-full">
      <!-- Card -->
      <div class="bg-white rounded-xl shadow-2xl p-8 sm:p-12 text-center space-y-6">
        <!-- Icon -->
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
        </div>

        <!-- Title -->
        <div>
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Aktuell in Entwicklung
          </h1>
          <p class="text-lg text-gray-600">
            Dieses Feature wird gerade entwickelt und ist bald verfügbar.
          </p>
        </div>

        <!-- Description -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
          <p class="text-gray-700">
            Wir arbeiten hart daran, dir die bestmögliche Erfahrung zu bieten. Bitte komm bald wieder vorbei, um die neuen Funktionen zu entdecken!
          </p>
        </div>

        <!-- Back Button -->
        <div class="pt-4">
          <button
            @click="navigateToDashboard"
            class="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Zurück zum Dashboard</span>
          </button>
        </div>

        <!-- Additional Info -->
        <div class="text-sm text-gray-500 pt-2">
          Kontaktiere den Support, falls du Fragen hast.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'

const navigateToDashboard = async () => {
  await navigateTo('/customer-dashboard')
}
</script>

<style scoped>
/* Smooth animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.min-h-screen {
  animation: fadeIn 0.5s ease-out;
}
</style>

