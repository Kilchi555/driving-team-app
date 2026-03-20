<template>
  <Teleport to="body" v-if="isOpen">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <h3 class="text-lg font-semibold text-white">Rechnungsadresse bearbeiten</h3>
          </div>
          <button @click="$emit('close')" class="text-white/70 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="overflow-y-auto flex-1 p-6 space-y-4">
          <!-- Error -->
          <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-sm text-red-700">{{ saveError }}</p>
          </div>

          <!-- Firmenname -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">
              Firmenname <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.company_name"
              type="text"
              class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              :class="showErrors && !form.company_name ? 'border-red-300 bg-red-50' : 'border-gray-300'"
              placeholder="Muster AG"
            />
            <p v-if="showErrors && !form.company_name" class="text-xs text-red-500">Pflichtfeld</p>
          </div>

          <!-- Kontaktperson -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">
              Kontaktperson <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.contact_person"
              type="text"
              class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              :class="showErrors && !form.contact_person ? 'border-red-300 bg-red-50' : 'border-gray-300'"
              placeholder="Max Muster"
            />
            <p v-if="showErrors && !form.contact_person" class="text-xs text-red-500">Pflichtfeld</p>
          </div>

          <!-- E-Mail -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">
              E-Mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              :class="showErrors && !form.email ? 'border-red-300 bg-red-50' : 'border-gray-300'"
              placeholder="info@muster.ch"
            />
            <p v-if="showErrors && !form.email" class="text-xs text-red-500">Pflichtfeld</p>
          </div>

          <!-- Telefon -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Telefon</label>
            <input
              v-model="form.phone"
              type="tel"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="+41 44 123 45 67"
            />
          </div>

          <!-- Adresse -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">
              Adresse <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <div class="col-span-2">
                <input
                  v-model="form.street"
                  type="text"
                  class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :class="showErrors && !form.street ? 'border-red-300 bg-red-50' : 'border-gray-300'"
                  placeholder="Hauptstrasse"
                />
              </div>
              <div>
                <input
                  v-model="form.street_number"
                  type="text"
                  class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :class="showErrors && !form.street_number ? 'border-red-300 bg-red-50' : 'border-gray-300'"
                  placeholder="Nr."
                />
              </div>
              <div>
                <input
                  v-model="form.zip"
                  type="text"
                  class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :class="showErrors && !form.zip ? 'border-red-300 bg-red-50' : 'border-gray-300'"
                  placeholder="PLZ"
                />
              </div>
              <div class="col-span-2">
                <input
                  v-model="form.city"
                  type="text"
                  class="w-full px-4 py-2.5 border rounded-lg text-sm transition focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  :class="showErrors && !form.city ? 'border-red-300 bg-red-50' : 'border-gray-300'"
                  placeholder="Stadt"
                />
              </div>
            </div>
            <p v-if="showErrors && (!form.street || !form.street_number || !form.zip || !form.city)" class="text-xs text-red-500">Alle Adressfelder sind Pflichtfelder</p>
          </div>

          <!-- Vollständigkeit Indikator -->
          <div class="flex items-center gap-2 pt-1">
            <div class="flex gap-1">
              <div v-for="n in 6" :key="n" class="w-6 h-1.5 rounded-full transition-colors" :class="n <= completedFields ? 'bg-indigo-500' : 'bg-gray-200'"></div>
            </div>
            <span class="text-xs text-gray-500">{{ completedFields }}/6 Pflichtfelder ausgefüllt</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 px-6 py-4 bg-gray-50 border-t flex-shrink-0">
          <button
            @click="$emit('close')"
            class="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Abbrechen
          </button>
          <button
            @click="trySave"
            :disabled="isSaving"
            class="flex-1 px-4 py-2.5 text-white rounded-lg transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :class="isComplete ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700' : 'bg-gray-300 cursor-not-allowed'"
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
import { ref, computed, watch } from 'vue'
import { logger } from '~/utils/logger'

interface Props {
  isOpen: boolean
  student: any
  existingAddress?: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const isSaving = ref(false)
const saveError = ref<string | null>(null)
const showErrors = ref(false)

const form = ref({
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  street: '',
  street_number: '',
  zip: '',
  city: ''
})

// Populate with existing data when opened
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      showErrors.value = false
      saveError.value = null
      if (props.existingAddress) {
        form.value = {
          company_name: props.existingAddress.company_name || '',
          contact_person: props.existingAddress.contact_person || '',
          email: props.existingAddress.email || '',
          phone: props.existingAddress.phone || '',
          street: props.existingAddress.street || '',
          street_number: props.existingAddress.street_number || '',
          zip: props.existingAddress.zip || '',
          city: props.existingAddress.city || ''
        }
      } else {
        form.value = {
          company_name: '',
          contact_person: '',
          email: '',
          phone: '',
          street: '',
          street_number: '',
          zip: '',
          city: ''
        }
      }
    }
  }
)

const completedFields = computed(() => {
  return [
    form.value.company_name,
    form.value.contact_person,
    form.value.email,
    form.value.street,
    form.value.street_number,
    form.value.zip || form.value.city
  ].filter(Boolean).length
})

const isComplete = computed(() => {
  return !!(
    form.value.company_name &&
    form.value.contact_person &&
    form.value.email &&
    form.value.street &&
    form.value.street_number &&
    form.value.zip &&
    form.value.city
  )
})

function trySave() {
  if (!isComplete.value) {
    showErrors.value = true
    return
  }
  saveChanges()
}

async function saveChanges() {
  if (!props.student?.id) return

  try {
    isSaving.value = true
    saveError.value = null

    await $fetch('/api/staff/save-billing-address', {
      method: 'POST',
      body: {
        user_id: props.student.id,
        ...form.value
      }
    })

    logger.debug('✅ Billing address saved')
    emit('saved')
    setTimeout(() => emit('close'), 300)
  } catch (error: any) {
    logger.error('❌ Error saving billing address:', error)
    saveError.value = error.data?.statusMessage || error.message || 'Fehler beim Speichern'
  } finally {
    isSaving.value = false
  }
}
</script>
