<template>
  <!-- Student Details Edit Modal -->
  <Teleport to="body" v-if="isOpen">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            <h3 class="text-lg font-semibold text-white">Persönliche Daten bearbeiten</h3>
          </div>
          <button
            @click="$emit('close')"
            class="text-white/70 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content - Scrollable -->
        <div class="overflow-y-auto flex-1 p-6 space-y-6">
          <!-- E-Mail -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900">E-Mail</label>
            <input
              v-model="formData.email"
              type="email"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="user@example.com"
            />
          </div>

          <!-- Telefon -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900">Telefon</label>
            <input
              v-model="formData.phone"
              type="tel"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="+41 79 123 45 67"
            />
          </div>

          <!-- Kategorien -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900">Kategorien</label>
            <div class="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div v-for="cat in selectableCategories" :key="cat" class="flex items-center">
                <input
                  :id="`cat-${cat}`"
                  v-model="formData.category"
                  type="checkbox"
                  :value="cat"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label :for="`cat-${cat}`" class="ml-2 text-sm text-gray-700">{{ cat }}</label>
              </div>
            </div>
            <p class="text-xs text-gray-500">{{ formData.category.length }} Kategorie{{ formData.category.length !== 1 ? 'n' : '' }} ausgewählt</p>
          </div>

          <!-- Geburtsdatum -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900">Geburtsdatum</label>
            <input
              v-model="formData.birthdate"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <!-- Ausweisnummer -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900">Ausweisnummer (SARI)</label>
            <input
              v-model="formData.faberid"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              placeholder="z.B. 1234567890"
            />
          </div>

          <!-- Adresse -->
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 space-y-2">
              <label class="block text-sm font-medium text-gray-900">Straße</label>
              <input
                v-model="formData.street"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Hauptstraße"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-900">Hausnummer</label>
              <input
                v-model="formData.street_nr"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="123"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-900">PLZ</label>
              <input
                v-model="formData.zip"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="8000"
              />
            </div>
            <div class="col-span-2 space-y-2">
              <label class="block text-sm font-medium text-gray-900">Stadt</label>
              <input
                v-model="formData.city"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Zürich"
              />
            </div>
          </div>

          <!-- Rechnungsadresse -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-900">Rechnungsadresse</label>
            <textarea
              v-model="formData.invoice_address"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Firmenname&#10;Straße 123&#10;8000 Zürich"
            ></textarea>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 px-6 py-4 bg-gray-50 border-t flex-shrink-0">
          <button
            @click="$emit('close')"
            class="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Abbrechen
          </button>
          <button
            @click="saveChanges"
            :disabled="isSaving"
            class="flex-1 px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isSaving ? 'Wird gespeichert...' : 'Speichern' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { logger } from '~/utils/logger'

interface Props {
  isOpen: boolean
  student: any
  selectableCategories?: string[]
}

interface Emits {
  (e: 'close'): void
  (e: 'save', data: any): void
}

const props = withDefaults(defineProps<Props>(), {
  selectableCategories: () => []
})

const emit = defineEmits<Emits>()

const isSaving = ref(false)
const formData = ref({
  email: '',
  phone: '',
  category: [] as string[],
  birthdate: '',
  faberid: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  invoice_address: ''
})

// Initialize form when student changes
watch(
  () => props.student,
  (student) => {
    if (student) {
      formData.value = {
        email: student.email || '',
        phone: student.phone || '',
        category: student.category ? [...student.category] : [],
        birthdate: student.birthdate || '',
        faberid: student.faberid || '',
        street: student.street || '',
        street_nr: student.street_nr || '',
        zip: student.zip || '',
        city: student.city || '',
        invoice_address: student.invoice_address || ''
      }
    }
  },
  { immediate: true, deep: true }
)

async function saveChanges() {
  if (!props.student?.id) return
  
  try {
    isSaving.value = true
    
    await $fetch('/api/staff/update-student-details', {
      method: 'POST',
      body: {
        user_id: props.student.id,
        ...formData.value
      }
    })
    
    logger.debug('✅ Student details updated:', formData.value)
    emit('save', formData.value)
  } catch (error: any) {
    logger.error('❌ Error updating student details:', error)
    // Error is handled by parent
  } finally {
    isSaving.value = false
  }
}
</script>
