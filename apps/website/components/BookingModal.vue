<template>
  <div>
    <!-- Booking Provider Buttons -->
    <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <button
        @click="openModal('nothelfer')"
        class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-red-400 transition cursor-pointer"
      >
        <p class="text-4xl mb-4">🏥</p>
        <h3 class="font-bold text-xl text-gray-900 mb-3">Nothelfer am Bahnhof</h3>
        <p class="text-gray-600 text-sm mb-4">Flexible Kurse mit professionellen Instruktoren</p>
        <span class="text-red-600 font-semibold">Jetzt buchen →</span>
      </button>
      <button
        @click="openModal('flying')"
        class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-red-400 transition cursor-pointer"
      >
        <p class="text-4xl mb-4">✈️</p>
        <h3 class="font-bold text-xl text-gray-900 mb-3">Flying-Instructor</h3>
        <p class="text-gray-600 text-sm mb-4">Spezialisiert auf Nothelferkurse mit Engagement</p>
        <span class="text-red-600 font-semibold">Jetzt buchen →</span>
      </button>
    </div>

    <!-- Modal Overlay -->
    <transition name="modal-fade">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <!-- Modal Content -->
        <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-50 pointer-events-auto">
          <!-- Header -->
          <div class="sticky top-0 bg-red-600 text-white p-6 flex justify-between items-center">
            <h2 class="heading-sm text-white">
              {{ activeProvider === 'nothelfer' ? '🏥 Nothelfer am Bahnhof' : '✈️ Flying-Instructor' }}
            </h2>
            <button
              @click="closeModal"
              class="text-white hover:bg-red-700 rounded p-2 transition"
              aria-label="Modal schließen"
            >
              ✕
            </button>
          </div>

          <!-- iframe Container -->
          <div class="p-6 pointer-events-auto">
            <div v-if="activeProvider === 'nothelfer'" class="w-full pointer-events-auto">
              <p class="text-gray-600 mb-4 text-center">Buchungsformular wird geladen...</p>
              <div class="pointer-events-auto">
                <iframe
                  id="courses-altstetten"
                  title="Nothelferkurs Altstetten"
                  height="1500"
                  src="https://namb.ch/iframe/nothelferkurs-altstetten"
                  style="border-style: none; width: 100%; padding: 2px; pointer-events: auto;"
                ></iframe>
              </div>
              <p class="text-sm text-gray-600 mt-4">
                ✓ Buchungsformular von Nothelfer am Bahnhof | Support: <a href="https://www.nothelferambahnhof.ch/support" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline">nothelferambahnhof.ch/support →</a>
              </p>
            </div>

            <div v-if="activeProvider === 'flying'" class="w-full pointer-events-auto">
              <p class="text-gray-600 mb-4 text-center">Buchungsformular wird geladen...</p>
              <div class="pointer-events-auto">
                <iframe
                  style="width:100%;height:800px!important; pointer-events: auto;"
                  src="https://flying-instructor.ch/iframe/Dxez1tKe5Z4ITnBy2iRdexoOXgvVrshe.eiurNYlQ"
                  title="Flying-Instructor - Buchungsformular"
                  frameborder="0"
                ></iframe>
              </div>
              <p class="text-sm text-gray-600 mt-4">
                ✓ Buchungsformular von Flying-Instructor | <a href="tel:0435439898" class="text-red-600 hover:underline">043 543 98 98</a> | <a href="mailto:info@flying-instructor.ch" class="text-red-600 hover:underline">info@flying-instructor.ch</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button
              @click="closeModal"
              class="w-full bg-gray-300 text-gray-900 py-2 rounded hover:bg-gray-400 transition font-semibold"
            >
              Modal schließen
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showModal = ref(false)
const activeProvider = ref<'nothelfer' | 'flying'>('nothelfer')

const openModal = (provider: 'nothelfer' | 'flying') => {
  activeProvider.value = provider
  showModal.value = true
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  showModal.value = false
  document.body.style.overflow = 'unset'
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
}
</style>
