<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-primary-600 rounded-xl p-6 sm:p-8 text-center">
      <p class="text-xs uppercase tracking-widest text-primary-200 font-semibold mb-1">{{ isSpecificRequest ? 'Interessentanfrage' : 'Allgemeine Anfrage' }}</p>
      <h2 class="text-2xl sm:text-3xl font-bold text-white">{{ formTitle }}</h2>
      <p class="text-white/90 text-sm mt-2">{{ formDescription }}</p>
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
            <div class="relative">
              <input
                v-model="firstName"
                type="text"
                name="given-name"
                autocomplete="given-name"
                placeholder="Max"
                @blur="touched.firstName = true"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm',
                  fieldErrors.firstName ? 'border-red-400 focus:ring-red-300' : fieldValid.firstName ? 'border-green-400 focus:ring-green-300' : 'border-gray-300'
                ]"
                :style="!fieldErrors.firstName && !fieldValid.firstName ? { '--tw-ring-color': getBrandPrimary() } : {}"
              />
              <span v-if="fieldValid.firstName" class="absolute right-2.5 top-2.5 text-green-500 text-sm">✓</span>
            </div>
            <p v-if="fieldErrors.firstName" class="text-xs text-red-500 mt-1">{{ fieldErrors.firstName }}</p>
          </div>

          <!-- Last Name -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nachname</label>
            <div class="relative">
              <input
                v-model="lastName"
                type="text"
                name="family-name"
                autocomplete="family-name"
                placeholder="Müller"
                @blur="touched.lastName = true"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm',
                  fieldErrors.lastName ? 'border-red-400 focus:ring-red-300' : fieldValid.lastName ? 'border-green-400 focus:ring-green-300' : 'border-gray-300'
                ]"
                :style="!fieldErrors.lastName && !fieldValid.lastName ? { '--tw-ring-color': getBrandPrimary() } : {}"
              />
              <span v-if="fieldValid.lastName" class="absolute right-2.5 top-2.5 text-green-500 text-sm">✓</span>
            </div>
            <p v-if="fieldErrors.lastName" class="text-xs text-red-500 mt-1">{{ fieldErrors.lastName }}</p>
          </div>
        </div>

        <!-- Company (optional) -->
        <div>
          <label class="block text-xs text-gray-600 mb-1">Firma <span class="text-gray-400">(optional)</span></label>
          <input
            v-model="company"
            type="text"
            name="organization"
            autocomplete="organization"
            placeholder="Muster AG"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Email -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Email</label>
            <div class="relative">
              <input
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="max@example.com"
                @blur="touched.email = true"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm',
                  fieldErrors.email ? 'border-red-400 focus:ring-red-300' : fieldValid.email ? 'border-green-400 focus:ring-green-300' : 'border-gray-300'
                ]"
                :style="!fieldErrors.email && !fieldValid.email ? { '--tw-ring-color': getBrandPrimary() } : {}"
              />
              <span v-if="fieldValid.email" class="absolute right-2.5 top-2.5 text-green-500 text-sm">✓</span>
            </div>
            <p v-if="fieldErrors.email" class="text-xs text-red-500 mt-1">{{ fieldErrors.email }}</p>
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Telefon</label>
            <div class="relative">
              <input
                v-model="phone"
                type="tel"
                name="tel"
                autocomplete="tel"
                placeholder="+41 79 123 45 67"
                @input="onPhoneInput"
                @blur="touched.phone = true"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm font-mono',
                  fieldErrors.phone ? 'border-red-400 focus:ring-red-300' : fieldValid.phone ? 'border-green-400 focus:ring-green-300' : 'border-gray-300'
                ]"
                :style="!fieldErrors.phone && !fieldValid.phone ? { '--tw-ring-color': getBrandPrimary() } : {}"
              />
              <span v-if="fieldValid.phone" class="absolute right-2.5 top-2.5 text-green-500 text-sm">✓</span>
            </div>
            <p v-if="fieldErrors.phone" class="text-xs text-red-500 mt-1">{{ fieldErrors.phone }}</p>
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
          @blur="touched.message = true"
          :class="[
            'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm resize-none',
            fieldErrors.message ? 'border-red-400 focus:ring-red-300' : fieldValid.message ? 'border-green-400 focus:ring-green-300' : 'border-gray-300'
          ]"
          :style="!fieldErrors.message && !fieldValid.message ? { '--tw-ring-color': getBrandPrimary() } : {}"
          rows="4"
        />
        <div class="flex justify-between items-center">
          <p v-if="fieldErrors.message" class="text-xs text-red-500">{{ fieldErrors.message }}</p>
          <p v-else class="text-xs text-gray-400"></p>
          <p class="text-xs" :class="characterCount > 950 ? 'text-orange-500' : 'text-gray-400'">{{ characterCount }}/1000</p>
        </div>
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
  },
  // Optional custom title override
  custom_title: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['submitted'])

// Form states
const firstName = ref('')
const lastName = ref('')
const company = ref('')
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

// Field-level touched state (show validation only after user interacted)
const touched = ref({
  firstName: false,
  lastName: false,
  email: false,
  phone: false,
  message: false
})

// Field-level validation
const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
const phoneRegex = /^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/

const fieldErrors = computed(() => ({
  firstName: touched.value.firstName && !firstName.value?.trim() ? 'Vorname ist erforderlich' : '',
  lastName: touched.value.lastName && !lastName.value?.trim() ? 'Nachname ist erforderlich' : '',
  email: touched.value.email
    ? !email.value?.trim()
      ? 'Email ist erforderlich'
      : !emailRegex.test(email.value)
        ? 'Bitte eine gültige Email-Adresse eingeben'
        : ''
    : '',
  phone: touched.value.phone
    ? !phone.value?.trim()
      ? 'Telefonnummer ist erforderlich'
      : !phoneRegex.test(phone.value.replace(/\s/g, ''))
        ? 'Bitte eine gültige Schweizer Nummer eingeben (z.B. +41 79 123 45 67)'
        : ''
    : '',
  message: touched.value.message && !message.value?.trim() ? 'Nachricht ist erforderlich' : ''
}))

const fieldValid = computed(() => ({
  firstName: touched.value.firstName && !!firstName.value?.trim(),
  lastName: touched.value.lastName && !!lastName.value?.trim(),
  email: touched.value.email && !!email.value?.trim() && emailRegex.test(email.value),
  phone: touched.value.phone && !!phone.value?.trim() && phoneRegex.test(phone.value.replace(/\s/g, '')),
  message: touched.value.message && !!message.value?.trim()
}))

// Computed properties
const isSpecificRequest = computed(() => props.mode === 'booking')

const formTitle = computed(() => {
  if (props.custom_title) return props.custom_title
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
      $fetch<{ categories: Category[] }>('/api/booking/get-categories', { query: { tenant_id: props.tenant_id } }),
      $fetch<{ locations: Location[] }>('/api/booking/get-locations', { query: { tenant_id: props.tenant_id } })
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
  // Mark all fields as touched to show validation errors
  touched.value = { firstName: true, lastName: true, email: true, phone: true, message: true }

  // Check for field errors
  if (Object.values(fieldErrors.value).some(e => e)) return

  if (isSpecificRequest.value) {
    if (!selectedCategory.value) { error.value = 'Bitte wählen Sie eine Fahrkategorie'; return }
    if (!selectedLocation.value) { error.value = 'Bitte wählen Sie einen Ort'; return }
    if (!selectedDuration.value) { error.value = 'Bitte wählen Sie eine Fahrstundendauer'; return }
  }

  try {
    error.value = ''
    isSubmitting.value = true

    // Submit as booking proposal with NULL time slots for general inquiries
    const payload: any = {
      tenant_id: props.tenant_id,
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      notes: company.value.trim()
        ? `Firma: ${company.value.trim()}\n\n${message.value.trim()}`
        : message.value.trim()
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

    const response = await $fetch<{ success: boolean; proposal_id: string }>('/api/booking/submit-general-inquiry', {
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
  firstName.value = ''
  lastName.value = ''
  company.value = ''
  email.value = ''
  phone.value = ''
  message.value = ''
  selectedCategory.value = props.initial_category || ''
  selectedLocation.value = props.initial_location || ''
  selectedDuration.value = props.initial_duration || null
  touched.value = { firstName: false, lastName: false, email: false, phone: false, message: false }
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
