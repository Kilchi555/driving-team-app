<!-- Formular für Terminpräferenzen (wenn Online-Buchung deaktiviert ist) -->
<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-6 sm:p-8">
      <!-- Header -->
      <div class="text-center mb-6">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Terminpräferenzen</h2>
        <p class="text-gray-600">Teilen Sie uns Ihre Präferenzen mit, wir melden uns dann bei Ihnen</p>
      </div>

      <!-- Progress für neue Kunden -->
      <div v-if="showRegistration" class="mb-6">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <div :class="['flex items-center', currentStep >= 1 ? 'text-blue-600' : 'text-gray-400']">
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600']">
              1
            </div>
            <span class="ml-2 text-sm hidden sm:inline">Präferenzen</span>
          </div>
          <div class="w-8 h-0.5 bg-gray-200"></div>
          <div :class="['flex items-center', currentStep >= 2 ? 'text-blue-600' : 'text-gray-400']">
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold', currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600']">
              2
            </div>
            <span class="ml-2 text-sm hidden sm:inline">Anmeldung</span>
          </div>
        </div>
      </div>

      <!-- Step 1: Präferenzen (immer sichtbar) -->
      <form v-if="currentStep === 1" @submit.prevent="submitPreferences" class="space-y-6">
        <!-- Personendaten (nur für nicht-angemeldete Kunden) -->
        <div v-if="!isLoggedIn" class="space-y-4 border-b pb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Ihre Kontaktdaten</h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
              <input
                v-model="formData.first_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Max"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
              <input
                v-model="formData.last_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input
              v-model="formData.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="max.mustermann@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              v-model="formData.phone"
              type="tel"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+41 79 123 45 67"
            />
          </div>
        </div>

        <!-- Fahrkategorie -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Gewünschte Fahrkategorie *</h3>
          <select
            v-model="formData.category_code"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Bitte wählen</option>
            <option v-for="category in categories" :key="category.code" :value="category.code">
              {{ category.code }} - {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Wochentage -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Bevorzugte Wochentage *</h3>
          <p class="text-sm text-gray-600 mb-4">Wählen Sie die Tage, an denen Sie Termine wahrnehmen können:</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
              :class="formData.preferred_days.includes(day.value)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'"
            >
              <input
                type="checkbox"
                :value="day.value"
                v-model="formData.preferred_days"
                class="sr-only"
              />
              <span class="text-lg font-semibold text-gray-700">{{ day.short }}</span>
              <span class="text-xs text-gray-600 mt-1">{{ day.label }}</span>
            </label>
          </div>
          <p v-if="formData.preferred_days.length === 0" class="text-sm text-red-600 mt-2">
            Bitte wählen Sie mindestens einen Wochentag aus
          </p>
        </div>

        <!-- Zeitfenster -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Bevorzugte Uhrzeit *</h3>
          <p class="text-sm text-gray-600 mb-4">Zwischen welchen Uhrzeiten können Sie Termine wahrnehmen?</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Von (Startzeit) *</label>
              <input
                v-model="formData.preferred_time_start"
                type="time"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Bis (Endzeit) *</label>
              <input
                v-model="formData.preferred_time_end"
                type="time"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Standortpräferenz -->
        <div class="border-b pb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Standort</h3>
          <p class="text-sm text-gray-600 mb-4">Haben Sie eine Standortpräferenz?</p>
          <select
            v-model="formData.preferred_location_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Keine Präferenz</option>
            <option v-for="location in locations" :key="location.id" :value="location.id">
              {{ location.name }} - {{ location.address }}
            </option>
          </select>
          <input
            v-if="formData.preferred_location_id === ''"
            v-model="formData.preferred_location_address"
            type="text"
            class="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Alternative Adresse (optional)"
          />
        </div>

        <!-- Zusätzliche Hinweise -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Zusätzliche Hinweise</label>
          <textarea
            v-model="formData.notes"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Haben Sie noch wichtige Informationen für uns?"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="submit"
            :disabled="isSubmitting || !isFormValid"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {{ isSubmitting ? 'Wird gesendet...' : (isLoggedIn ? 'Präferenzen speichern' : 'Weiter zur Anmeldung') }}
          </button>
        </div>
      </form>

      <!-- Step 2: Anmeldung für neue Kunden -->
      <RegistrationForm
        v-if="currentStep === 2 && !isLoggedIn"
        :tenant-slug="tenantSlug"
        :pre-filled-data="formData"
        @registration-complete="handleRegistrationComplete"
        @back="currentStep = 1"
      />

      <!-- Success Message -->
      <div v-if="showSuccess" class="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div class="text-4xl mb-4">✅</div>
        <h3 class="text-lg font-semibold text-green-900 mb-2">Präferenzen gespeichert!</h3>
        <p class="text-green-700">
          {{ isLoggedIn 
            ? 'Wir werden Sie kontaktieren und einen passenden Termin vorschlagen.'
            : 'Vielen Dank! Wir melden uns in Kürze bei Ihnen.' 
          }}
        </p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-red-900 mb-2">Fehler</h3>
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
// ✅ MIGRATED TO API - Removed direct Supabase import
// import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { useRoute } from 'vue-router'
import RegistrationForm from './RegistrationForm.vue'

const props = defineProps<{
  tenantSlug: string
  tenantId?: string
}>()

// ✅ MIGRATED TO API - Removed Supabase client
// const supabase = getSupabase()
const authStore = useAuthStore()
const route = useRoute()

// State
const isLoggedIn = computed(() => authStore.isLoggedIn && authStore.userProfile)
const currentUser = computed(() => authStore.userProfile)
const currentStep = ref(1)
const isSubmitting = ref(false)
const showSuccess = ref(false)
const error = ref<string | null>(null)
const showRegistration = ref(false)

// Form Data
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  category_code: '',
  preferred_days: [] as string[],
  preferred_time_start: '08:00',
  preferred_time_end: '18:00',
  preferred_location_id: '',
  preferred_location_address: '',
  notes: ''
})

// Data
const categories = ref<any[]>([])
const locations = ref<any[]>([])

// Wochentage
const weekDays = [
  { value: 'monday', label: 'Montag', short: 'Mo' },
  { value: 'tuesday', label: 'Dienstag', short: 'Di' },
  { value: 'wednesday', label: 'Mittwoch', short: 'Mi' },
  { value: 'thursday', label: 'Donnerstag', short: 'Do' },
  { value: 'friday', label: 'Freitag', short: 'Fr' },
  { value: 'saturday', label: 'Samstag', short: 'Sa' },
  { value: 'sunday', label: 'Sonntag', short: 'So' }
]

// Computed
const isFormValid = computed(() => {
  if (!isLoggedIn.value) {
    return formData.value.first_name && 
           formData.value.last_name && 
           formData.value.email &&
           formData.value.category_code &&
           formData.value.preferred_days.length > 0 &&
           formData.value.preferred_time_start &&
           formData.value.preferred_time_end
  }
  return formData.value.category_code &&
         formData.value.preferred_days.length > 0 &&
         formData.value.preferred_time_start &&
         formData.value.preferred_time_end
})

// Methods
const loadData = async () => {
  try {
    // Wenn keine tenantId, versuche aus slug zu laden
    let tenantId = props.tenantId
    
    if (!tenantId && props.tenantSlug) {
      // ✅ MIGRATED TO API - Get tenant ID from slug
      const response = await $fetch('/api/booking/get-availability', {
        method: 'POST',
        body: {
          action: 'get-tenant-data',
          slug: props.tenantSlug
        }
      }) as any

      if (response?.success && response?.data) {
        tenantId = response.data.id
      }
    }
    
    if (!tenantId) {
      console.error('❌ No tenant ID or slug provided')
      return
    }

    // ✅ MIGRATED TO API - Load categories and locations
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        action: 'get-booking-setup',
        tenant_id: tenantId
      }
    }) as any

    if (response?.success && response?.data) {
      categories.value = response.data.categories || []
      locations.value = response.data.locations || []
    }

    // Pre-fill für angemeldete Benutzer
    if (isLoggedIn.value && currentUser.value) {
      formData.value.first_name = currentUser.value.first_name || ''
      formData.value.last_name = currentUser.value.last_name || ''
      formData.value.email = currentUser.value.email || ''
      formData.value.phone = currentUser.value.phone || ''
    }
  } catch (err: any) {
    console.error('Error loading data:', err)
    error.value = 'Fehler beim Laden der Daten'
  }
}

const submitPreferences = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true
  error.value = null

  try {
    // Get tenant ID (from prop or load from slug)
    let tenantId = props.tenantId
    
    if (!tenantId && props.tenantSlug) {
      // ✅ MIGRATED TO API - Get tenant ID from slug
      const response = await $fetch('/api/booking/get-availability', {
        method: 'POST',
        body: {
          action: 'get-tenant-data',
          slug: props.tenantSlug
        }
      }) as any

      if (response?.success && response?.data) {
        tenantId = response.data.id
      }
    }
    
    if (!tenantId) {
      throw new Error('Tenant-ID fehlt')
    }

    const preferenceData = {
      tenant_id: tenantId,
      user_id: isLoggedIn.value ? currentUser.value?.id : null,
      email: formData.value.email,
      first_name: formData.value.first_name,
      last_name: formData.value.last_name,
      phone: formData.value.phone || null,
      category_code: formData.value.category_code,
      preferred_days: formData.value.preferred_days,
      preferred_time_start: formData.value.preferred_time_start + ':00',
      preferred_time_end: formData.value.preferred_time_end + ':00',
      preferred_location_id: formData.value.preferred_location_id || null,
      preferred_location_address: formData.value.preferred_location_address || null,
      notes: formData.value.notes || null,
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 Tage
    }

    // ✅ MIGRATED TO API - Save appointment preferences via backend
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        action: 'save-appointment-preferences',
        preference_data: preferenceData
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Fehler beim Speichern')
    }

    // Wenn angemeldet → Erfolg anzeigen
    if (isLoggedIn.value) {
      showSuccess.value = true
      setTimeout(() => {
        showSuccess.value = false
      }, 5000)
    } else {
      // Wenn nicht angemeldet → Weiter zur Anmeldung
      showRegistration.value = true
      currentStep.value = 2
    }
  } catch (err: any) {
    console.error('Error submitting preferences:', err)
    error.value = err.message || 'Fehler beim Speichern der Präferenzen'
  } finally {
    isSubmitting.value = false
  }
}

const handleRegistrationComplete = () => {
  showSuccess.value = true
  currentStep.value = 1
  showRegistration.value = false
}

// Lifecycle
onMounted(async () => {
  await loadData()
})
</script>

