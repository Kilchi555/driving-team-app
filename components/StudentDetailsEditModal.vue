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
          <button @click="$emit('close')" class="text-white/70 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content - Scrollable -->
        <div class="overflow-y-auto flex-1 p-6 space-y-5">
          <!-- Error Alert -->
          <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-red-900">Fehler beim Speichern</p>
              <p class="text-sm text-red-700 mt-0.5">{{ saveError }}</p>
            </div>
            <button @click="saveError = null" class="text-red-400 hover:text-red-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- E-Mail -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">E-Mail</label>
            <input
              v-model="formData.email"
              type="email"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              placeholder="user@example.com"
            />
          </div>

          <!-- Telefon -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Telefon</label>
            <input
              v-model="formData.phone"
              type="tel"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              placeholder="+41 79 123 45 67"
            />
          </div>

          <!-- Kategorien -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Kategorien</label>
            <div v-if="loadingCategories" class="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500 flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Kategorien werden geladen...
            </div>
            <div v-else-if="categories.length > 0" class="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-44 overflow-y-auto">
              <label
                v-for="cat in categories"
                :key="cat.id"
                class="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  v-model="formData.category"
                  type="checkbox"
                  :value="cat.code"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 group-hover:text-gray-900">{{ (cat.name || cat.code).replace(/^Kategorie\s*/i, '') }}</span>
              </label>
            </div>
            <div v-else class="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500 italic">
              Keine Kategorien verfügbar
            </div>
            <p class="text-xs text-gray-500">{{ formData.category.length }} ausgewählt</p>
          </div>

          <!-- Geburtsdatum -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Geburtsdatum</label>
            <input
              v-model="formData.birthdate"
              type="date"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
            />
          </div>

          <!-- Adresse -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Adresse</label>
            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <input
                  v-model="formData.street"
                  type="text"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="Hauptstrasse"
                />
              </div>
              <div>
                <input
                  v-model="formData.street_nr"
                  type="text"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="Nr."
                />
              </div>
              <div>
                <input
                  v-model="formData.zip"
                  type="text"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="PLZ"
                />
              </div>
              <div class="col-span-2">
                <input
                  v-model="formData.city"
                  type="text"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="Stadt"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->        <div class="flex gap-3 px-6 py-4 bg-gray-50 border-t flex-shrink-0">
          <button
            @click="$emit('close')"
            class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Abbrechen
          </button>
          <button
            @click="saveChanges"
            :disabled="isSaving"
            class="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
import { ref, watch } from 'vue'
import { logger } from '~/utils/logger'

interface Props {
  isOpen: boolean
  student: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: any): void
}>()

const isSaving = ref(false)
const saveError = ref<string | null>(null)
const loadingCategories = ref(false)
const categories = ref<any[]>([])

const formData = ref({
  email: '',
  phone: '',
  category: [] as string[],
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: ''
})

// Load tenant categories from API - only subcategories to avoid duplicates
async function loadCategories() {
  try {
    loadingCategories.value = true
    const response = await $fetch<{ success: boolean; data: any[] }>('/api/staff/get-categories')
    // Only show subcategories (those with a parent) to avoid showing duplicates
    categories.value = (response.data || []).filter((cat: any) => cat.parent_category_id !== null)
  } catch (error: any) {
    logger.error('❌ Error loading categories:', error)
    categories.value = []
  } finally {
    loadingCategories.value = false
  }
}

// Load billing address
async function loadBillingAddress() {
  if (!props.student?.id) return
  try {
    loadingBilling.value = true
    const response = await $fetch<{ success: boolean; data: any }>(`/api/staff/get-billing-address?user_id=${props.student.id}`)
    if (response.data) {
      billingData.value = {
        company_name: response.data.company_name || '',
        contact_person: response.data.contact_person || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        street: response.data.street || '',
        street_number: response.data.street_number || '',
        zip: response.data.zip || '',
        city: response.data.city || ''
      }
    }
  } catch (error: any) {
    logger.error('❌ Error loading billing address:', error)
  } finally {
    loadingBilling.value = false
  }
}

// Init form + load categories when opened
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadCategories()
      saveError.value = null
    }
  }
)
// Populate form when student changes
watch(
  () => props.student,
  (student) => {
    if (student) {
      formData.value = {
        email: student.email || '',
        phone: student.phone || '',
        category: student.category ? [...student.category] : [],
        birthdate: student.birthdate || '',
        street: student.street || '',
        street_nr: student.street_nr || '',
        zip: student.zip || '',
        city: student.city || ''
      }
    }
  },
  { immediate: true, deep: true }
)

async function saveChanges() {
  if (!props.student?.id) {
    saveError.value = 'Schüler-ID fehlt'
    return
  }

  try {
    isSaving.value = true
    saveError.value = null

    await $fetch('/api/staff/update-student-details', {
      method: 'POST',
      body: {
        user_id: props.student.id,
        ...formData.value
      }
    })

    logger.debug('✅ Student details updated:', formData.value)
    emit('save', formData.value)

    setTimeout(() => emit('close'), 300)
  } catch (error: any) {
    logger.error('❌ Error updating student details:', error)
    saveError.value = error.data?.statusMessage || error.data?.message || error.message || 'Fehler beim Speichern'
  } finally {
    isSaving.value = false
  }
}
</script>
