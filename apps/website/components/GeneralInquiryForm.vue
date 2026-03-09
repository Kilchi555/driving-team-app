<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6">
      <div class="text-center">
        <p class="text-xs uppercase tracking-wide text-gray-400">{{ isSpecificRequest ? 'Interessentanfrage' : 'Allgemeine Anfrage' }}</p>
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900">{{ formTitle }}</h2>
        <p class="text-sm text-gray-600 mt-2">{{ formDescription }}</p>
      </div>
    </div>

    <!-- Form Card -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6 space-y-6">
      <!-- Category Selection (only if isSpecificRequest) -->
      <div v-if="isSpecificRequest" class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          Fahrkategorie <span class="text-red-500">*</span>
        </label>
        <select
          v-model="selectedCategory"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
          :style="{ '--tw-ring-color': getBrandPrimary() }"
        >
          <option value="">Wähle eine Kategorie...</option>
          <option v-for="cat in categories" :key="cat.code" :value="cat.code">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Location Selection (only if isSpecificRequest) -->
      <div v-if="isSpecificRequest" class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          Ort/Filiale <span class="text-red-500">*</span>
        </label>
        <select
          v-model="selectedLocation"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
          :style="{ '--tw-ring-color': getBrandPrimary() }"
        >
          <option value="">Wähle einen Ort...</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
      </div>

      <!-- Duration Selection (only if isSpecificRequest) -->
      <div v-if="isSpecificRequest && selectedCategory" class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          Fahrstundendauer <span class="text-red-500">*</span>
        </label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="duration in availableDurations"
            :key="duration"
            @click="selectedDuration = duration"
            :class="{
              'text-white border-transparent': selectedDuration === duration,
              'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300': selectedDuration !== duration
            }"
            :style="selectedDuration === duration ? { backgroundColor: getBrandPrimary() } : {}"
            class="py-2 px-3 text-sm font-medium border rounded-lg transition-colors"
          >
            {{ duration }} min
          </button>
        </div>
      </div>

      <!-- Contact Information Section -->
      <div class="space-y-4">
        <label class="block text-sm font-semibold text-gray-900">
          Deine Kontaktdaten <span class="text-red-500">*</span>
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- First Name -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Vorname</label>
            <input
              v-model="firstName"
              type="text"
              placeholder="Max"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>

          <!-- Last Name -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nachname</label>
            <input
              v-model="lastName"
              type="text"
              placeholder="Müller"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Email -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="max@example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Telefon</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="+41791234567"
              @input="onPhoneInput"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm font-mono"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>
        </div>
      </div>

      <!-- Message -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-gray-900">
          {{ messageLabel }} <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="message"
          :placeholder="messagePlaceholder"
          :maxlength="1000"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm resize-none"
          :style="{ '--tw-ring-color': getBrandPrimary() }"
          rows="4"
        />
        <p class="text-xs" :class="characterCount > 950 ? 'text-orange-500' : 'text-gray-500'">{{ characterCount }}/1000 Zeichen</p>
      </div>

      <!-- Error Messages -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- Submit Button -->
      <button
        @click="submitInquiry"
        :disabled="isSubmitting || !isFormValid"
        :class="{
          'opacity-50 cursor-not-allowed': isSubmitting || !isFormValid
        }"
        class="w-full py-3 px-4 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        :style="{
          backgroundColor: getBrandPrimary()
        }"
      >
        {{ isSubmitting ? 'Wird gesendet...' : 'Anfrage absenden' }}
      </button>
    </div>

    <!-- Success Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showSuccessModal"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          @click.self="closeModal"
        >
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center space-y-4 animate-scale-in">
            <!-- Success Icon -->
            <div
              class="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl"
              :style="{ backgroundColor: getBrandPrimary() }"
            >
              ✓
            </div>

            <!-- Success Message -->
            <div>
              <h3 class="text-xl font-bold text-gray-900">Danke für deine Anfrage!</h3>
              <p class="text-sm text-gray-600 mt-2">
                Wir haben deine Anfrage erhalten und werden uns in Kürze bei dir melden.
              </p>
            </div>

            <!-- Close Button -->
            <button
              @click="closeModal"
              class="w-full py-2 px-4 text-white font-semibold rounded-lg transition-colors hover:brightness-110"
              :style="{ backgroundColor: getBrandPrimary() }"
            >
              Schliessen
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

// Driving Team primary color (used directly in website app)
const getBrandPrimary = () => '#1C64F2'

interface Category {
  id: number
  code: string
  name: string
  lesson_duration_minutes: number[]
}

interface Location {
  id: string
  name: string
}

const props = defineProps({
  tenant_id: {
    type: String,
    required: true
  },
  // Optional pre-selection from URL
  initial_category: {
    type: String,
    default: null
  },
  initial_location: {
    type: String,
    default: null
  },
  initial_duration: {
    type: Number,
    default: null
  },
  // Mode: 'general' for general inquiries, 'booking' for specific lesson requests
  mode: {
    type: String,
    default: 'general',
    validator: (value: string) => ['general', 'booking'].includes(value)
  }
})

const emit = defineEmits(['submitted'])

// Form states
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const message = ref('')
const selectedCategory = ref(props.initial_category || '')
const selectedLocation = ref(props.initial_location || '')
const selectedDuration = ref(props.initial_duration || null)

// UI states
const error = ref('')
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const categories = ref<Category[]>([])
const locations = ref<Location[]>([])
const characterCount = ref(0)

// Computed properties
const isSpecificRequest = computed(() => props.mode === 'booking')

const formTitle = computed(() => {
  return isSpecificRequest.value
    ? 'Fahrstunde anfragen'
    : 'Schreib uns eine Nachricht'
})

const formDescription = computed(() => {
  return isSpecificRequest.value
    ? 'Wir helfen dir gerne bei der Suche nach deinem perfekten Fahrtermin'
    : 'Hast du Fragen? Wir freuen uns auf deine Nachricht'
})

const messageLabel = computed(() => {
  return isSpecificRequest.value ? 'Zusätzliche Bemerkungen' : 'Deine Nachricht'
})

const messagePlaceholder = computed(() => {
  return isSpecificRequest.value
    ? 'z.B. Flexible Zeiten, spezielle Anforderungen, etc.'
    : 'Erzähl uns, worum es geht...'
})

const availableDurations = computed(() => {
  const category = categories.value.find(c => c.code === selectedCategory.value)
  return category?.lesson_duration_minutes || [45]
})

const isFormValid = computed(() => {
  const hasContactInfo = firstName.value?.trim() && lastName.value?.trim() && email.value?.trim() && phone.value?.trim()
  const hasMessage = message.value?.trim()

  if (isSpecificRequest.value) {
    return hasContactInfo && hasMessage && selectedCategory.value && selectedLocation.value && selectedDuration.value
  }

  return hasContactInfo && hasMessage
})

// Format Swiss phone number
const formatSwissPhoneNumber = (value: string): string => {
  let cleaned = value.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  }

  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+41' + cleaned.substring(1)
  }

  if (cleaned.startsWith('+41')) {
    const digits = cleaned.substring(3)
    if (digits.length <= 2) {
      return '+41 ' + digits
    } else if (digits.length <= 5) {
      return '+41 ' + digits.substring(0, 2) + ' ' + digits.substring(2)
    } else if (digits.length <= 8) {
      return '+41 ' + digits.substring(0, 2) + ' ' + digits.substring(2, 5) + ' ' + digits.substring(5)
    } else {
      return '+41 ' + digits.substring(0, 2) + ' ' + digits.substring(2, 5) + ' ' + digits.substring(5, 7) + ' ' + digits.substring(7, 9)
    }
  }

  return cleaned
}

const onPhoneInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const formatted = formatSwissPhoneNumber(input.value)
  phone.value = formatted
  input.value = formatted
}

// Load categories and locations
const loadData = async () => {
  try {
    const [categoriesRes, locationsRes] = await Promise.all([
      $fetch('/api/booking/get-categories', { query: { tenant_id: props.tenant_id } }),
      $fetch('/api/booking/get-locations', { query: { tenant_id: props.tenant_id } })
    ])

    if (categoriesRes?.categories) {
      categories.value = categoriesRes.categories
    }
    if (locationsRes?.locations) {
      locations.value = locationsRes.locations
    }
  } catch (err: any) {
    console.warn('⚠️ Error loading form data:', err.message)
  }
}

const submitInquiry = async () => {
  try {
    error.value = ''

    // Validate required fields
    if (!firstName.value?.trim()) {
      error.value = 'Bitte geben Sie Ihren Vornamen an'
      return
    }

    if (!lastName.value?.trim()) {
      error.value = 'Bitte geben Sie Ihren Nachnamen an'
      return
    }

    if (!email.value?.trim()) {
      error.value = 'Bitte geben Sie Ihre Email-Adresse an'
      return
    }

    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
    if (!emailRegex.test(email.value)) {
      error.value = 'Bitte geben Sie eine gültige Email-Adresse ein'
      return
    }

    if (!phone.value?.trim()) {
      error.value = 'Bitte geben Sie Ihre Telefonnummer an'
      return
    }

    const phoneRegex = /^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/
    if (!phoneRegex.test(phone.value.replace(/\s/g, ''))) {
      error.value = 'Bitte geben Sie eine gültige Schweizer Telefonnummer ein (z.B. +41 79 123 45 67)'
      return
    }

    if (!message.value?.trim()) {
      error.value = isSpecificRequest.value ? 'Bitte geben Sie Bemerkungen ein' : 'Bitte schreiben Sie eine Nachricht'
      return
    }

    if (isSpecificRequest.value) {
      if (!selectedCategory.value) {
        error.value = 'Bitte wählen Sie eine Fahrkategorie'
        return
      }

      if (!selectedLocation.value) {
        error.value = 'Bitte wählen Sie einen Ort'
        return
      }

      if (!selectedDuration.value) {
        error.value = 'Bitte wählen Sie eine Fahrstundendauer'
        return
      }
    }

    isSubmitting.value = true

    // Submit as booking proposal with NULL time slots for general inquiries
    const payload: any = {
      tenant_id: props.tenant_id,
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      notes: message.value.trim()
    }

    if (isSpecificRequest.value) {
      payload.category_code = selectedCategory.value
      payload.location_id = selectedLocation.value
      payload.duration_minutes = selectedDuration.value
      payload.staff_id = null // Will be assigned by staff
      payload.preferred_time_slots = [] // No time slots for general inquiries
    } else {
      // For general inquiries, use NULL values
      payload.category_code = null
      payload.location_id = null
      payload.duration_minutes = null
      payload.staff_id = null
      payload.preferred_time_slots = []
    }

    const response = await $fetch('/api/booking/submit-general-inquiry', {
      method: 'POST',
      body: payload
    })

    if (response?.success) {
      console.log('✅ Inquiry submitted:', response.proposal_id)
      showSuccessModal.value = true

      // Auto-close after 3 seconds
      setTimeout(() => {
        closeModal()
      }, 3000)

      emit('submitted', response.proposal_id)
    }
  } catch (err: any) {
    console.error('❌ Error submitting inquiry:', err)
    error.value = err.data?.message || err.message || 'Fehler beim Absenden der Anfrage'
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  showSuccessModal.value = false
  // Reset form after modal closes
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  phone.value = ''
  message.value = ''
  selectedCategory.value = props.initial_category || ''
  selectedLocation.value = props.initial_location || ''
  selectedDuration.value = props.initial_duration || null
}

// Watch message length
watch(message, (val) => {
  characterCount.value = val.length
})

// Load data on mount
onMounted(() => {
  loadData()
})
</script>

<style scoped>
@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
