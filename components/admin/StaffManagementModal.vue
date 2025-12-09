<template>
  <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto min-h-[100svh] w-full z-50 p-2 sm:p-4" @click="$emit('close')">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl max-h-[calc(100svh-80px-env(safe-area-inset-bottom,0px))] overflow-y-auto shadow-lg rounded-md bg-white admin-modal" @click.stop>
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-medium text-gray-900">👨‍🏫 Neuen Fahrlehrer hinzufügen</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-600 mt-2">
          Erstellen Sie einen neuen Fahrlehrer-Account mit automatischer Kassen-Erstellung
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- Personal Information -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-4">Persönliche Daten</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
              <input
                v-model="form.first_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Max"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
              <input
                v-model="form.last_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mustermann"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="max.mustermann@firma.ch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                v-model="form.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+41 44 123 45 67"
              />
            </div>
          </div>
        </div>

        <!-- Staff Settings -->
        <div class="bg-blue-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-4">Fahrlehrer-Einstellungen</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fahrlehrer-Typ</label>
              <select
                v-model="form.staff_type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="instructor">Fahrlehrer</option>
                <option value="theory_instructor">Theorielehrer</option>
                <option value="exam_instructor">Prüfungsexperte</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Startkapital Kasse (CHF)</label>
              <input
                v-model.number="form.initial_cash"
                type="number"
                step="0.05"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <!-- Account Settings -->
        <div class="bg-yellow-50 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-4">Account-Einstellungen</h4>
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <input
                id="create_auth_account"
                v-model="form.create_auth_account"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="create_auth_account" class="text-sm font-medium text-gray-700">
                Login-Account erstellen (empfohlen)
              </label>
            </div>
            
            <div v-if="form.create_auth_account" class="ml-7 space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Temporäres Passwort</label>
                <input
                  v-model="form.temp_password"
                  type="password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mindestens 8 Zeichen"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Der Fahrlehrer kann das Passwort nach dem ersten Login ändern
                </p>
              </div>
            </div>
            
            <div class="bg-white border border-yellow-200 rounded p-3">
              <p class="text-xs text-yellow-800">
                <strong>Hinweis:</strong> Nur Administratoren können Fahrlehrer-Accounts erstellen. 
                Die Rolle wird automatisch auf "staff" gesetzt und eine persönliche Kasse wird erstellt.
              </p>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            :disabled="!isFormValid || isSubmitting"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isSubmitting ? 'Erstelle Fahrlehrer...' : 'Fahrlehrer erstellen' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed } from 'vue'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [staff: any]
}>()

// State
const isSubmitting = ref(false)

// Form
const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  staff_type: 'instructor',
  initial_cash: 0,
  create_auth_account: true,
  temp_password: ''
})

// Computed
const isFormValid = computed(() => {
  return form.value.first_name.trim() && 
         form.value.last_name.trim() && 
         form.value.email.trim() &&
         (!form.value.create_auth_account || form.value.temp_password.length >= 8)
})

// Methods
const handleSubmit = async () => {
  if (!isFormValid.value) return
  
  isSubmitting.value = true
  
  try {
    logger.debug('🚀 Creating new staff member:', form.value)
    
    // Call API to create staff with cash register
    const response = await $fetch('/api/admin/create-staff', {
      method: 'POST',
      body: {
        ...form.value,
        role: 'staff' // Force role to staff (security)
      }
    })
    
    logger.debug('✅ Staff member created:', response)
    
    // Reset form and emit success
    form.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      staff_type: 'instructor',
      initial_cash: 0,
      create_auth_account: true,
      temp_password: ''
    }
    
    emit('created', response)
    emit('close')
    
  } catch (err: any) {
    console.error('❌ Error creating staff:', err)
    alert('Fehler beim Erstellen des Fahrlehrers: ' + (err.data?.message || err.message))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

