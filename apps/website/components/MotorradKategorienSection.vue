<template>
  <section class="bg-gray-50 py-16">
    <div class="section-container">
      <h2 class="heading-md mb-10 text-center">Motorrad Kategorien</h2>
      <div class="max-w-4xl mx-auto space-y-4">
        <div 
          v-for="kategorie in kategorien" 
          :key="kategorie.id"
          class="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <button
            @click="toggleOpen(kategorie.id)"
            class="w-full font-bold text-gray-900 p-6 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
          >
            {{ kategorie.titel }}
            <span 
              class="text-gray-400 transition-transform duration-200 flex-shrink-0"
              :class="{ 'rotate-180': openStates[kategorie.id] }"
            >
              ▼
            </span>
          </button>
          
          <Transition name="expand">
            <div 
              v-if="openStates[kategorie.id]"
              class="px-6 pb-6 pt-2 border-t border-gray-100"
            >
              <ul class="text-gray-600 text-sm space-y-2">
                <li v-for="punkt in kategorie.punkte" :key="punkt" class="flex items-start gap-2">
                  <span class="text-green-600 font-semibold flex-shrink-0">✓</span>
                  <span>{{ punkt }}</span>
                </li>
              </ul>
            </div>
          </Transition>
        </div>
      </div>

      <div class="max-w-4xl mx-auto mt-8 bg-gray-50 rounded p-4 text-xs text-gray-500 border border-gray-200">
        <p>* Wenn der obligatorische Motorrad Grundkurs von 3 x 4 Stunden seit dem 01.01.2021 schon mal absolviert wurde, ist dieser immer noch gültig.</p>
        <p class="mt-2">** Bei Kategorie A1 muss die praktische Fahrprüfung nur absolviert werden, wenn man den Führerausweis fürs Auto noch nicht besitzt.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const kategorien = [
  {
    id: 'a1-50',
    titel: 'Kategorie A1 (bis 50cm³, max. 4kW, 45km/h)',
    punkte: [
      'Ab 15 Jahren erlaubt',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung**'
    ]
  },
  {
    id: 'a1-125',
    titel: 'Kategorie A1 (bis 125cm³, max. 11kW)',
    punkte: [
      'Ab 16 Jahren erlaubt',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung**'
    ]
  },
  {
    id: 'a-35',
    titel: 'Kategorie A 35kW (bis 35kW)',
    punkte: [
      'Ab 18 Jahren erlaubt',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung'
    ]
  },
  {
    id: 'a-unlimited',
    titel: 'Kategorie A (über 35kW)',
    punkte: [
      'Ab 20 Jahren (min. 2 Jahre 35kW)',
      'Innerhalb 4 Monaten 12h Grundkurs*',
      'Anschliessend praktische Fahrprüfung'
    ]
  }
]

const openStates = ref<Record<string, boolean>>({
  'a1-50': false,
  'a1-125': false,
  'a-35': false,
  'a-unlimited': false
})

const toggleOpen = (id: string) => {
  openStates.value[id] = !openStates.value[id]
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
  overflow: hidden;
}
</style>
