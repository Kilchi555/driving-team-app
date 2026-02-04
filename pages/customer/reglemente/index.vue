<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div class="flex items-center space-x-4">
          <button
            @click="$router.back()"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Reglemente</h1>
            <p class="text-sm text-gray-600 mt-1">Lesen Sie unsere Geschäftsbedingungen und Richtlinien</p>
          </div>
        </div>
      </div>

      <!-- Reglemente List -->
      <div class="space-y-4">
        <button
          v-for="(item, index) in reglementItems"
          :key="index"
          @click="openReglementModal(item.type)"
          class="w-full bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 text-left border border-transparent hover:border-blue-300"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="item.bgColor">
                <component :is="item.icon" class="w-6 h-6" :class="item.iconColor" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">{{ item.title }}</h3>
                <p class="text-sm text-gray-600 mt-1">{{ item.description }}</p>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- Reglement Modal -->
    <ReglementModal
      :is-open="showReglementModal"
      :type="selectedReglementType"
      @close="closeReglementModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ReglementModal from '~/components/customer/ReglementModal.vue'

// Meta
definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const showReglementModal = ref(false)
const selectedReglementType = ref<string>('')

// Icons as simple SVG components
const LockIcon = 'svg'
const DocumentIcon = 'svg'
const ShieldIcon = 'svg'
const AlertIcon = 'svg'
const UndoIcon = 'svg'

const reglementItems = ref([
  {
    type: 'datenschutz',
    title: 'Datenschutzerklärung',
    description: 'Schutz Ihrer persönlichen Daten',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    type: 'nutzungsbedingungen',
    title: 'Nutzungsbedingungen',
    description: 'Bedingungen für die Nutzung unserer Dienste',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    type: 'agb',
    title: 'Allgemeine Geschäftsbedingungen (AGB)',
    description: 'Allgemeine Geschäftsbedingungen',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    type: 'haftung',
    title: 'Haftungsausschluss',
    description: 'Haftungsbestimmungen und Einschränkungen',
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    type: 'rueckerstattung',
    title: 'Rückerstattungsrichtlinien',
    description: 'Bedingungen für Rückerstattungen',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  }
])

const openReglementModal = (type: string) => {
  selectedReglementType.value = type
  showReglementModal.value = true
}

const closeReglementModal = () => {
  showReglementModal.value = false
  selectedReglementType.value = ''
}
</script>

