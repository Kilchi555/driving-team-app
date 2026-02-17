<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6">
      <div class="text-center">
        <p class="text-xs uppercase tracking-wide text-gray-400">Alternative Anfrage</p>
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Deine bevorzugten Zeitfenster</h2>
      
      </div>
     
    </div>

    <!-- Time Slots Form -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6 space-y-6">
      <!-- Day Selection -->
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          Wähle deine bevorzugten Tage
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            v-for="(dayName, dayIndex) in days"
            :key="dayIndex"
            @click="toggleDay(dayIndex)"
            :class="{
              'text-white border-transparent': selectedDays.includes(dayIndex),
              'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300': !selectedDays.includes(dayIndex)
            }"
            :style="selectedDays.includes(dayIndex) ? { backgroundColor: getBrandPrimary() } : {}"
            class="py-2 px-3 text-sm font-medium border rounded-lg transition-colors"
          >
            {{ dayName }}
          </button>
        </div>
      </div>

      <!-- Time Slots per Day -->
      <div class="space-y-4">
        <label class="block text-sm font-semibold text-gray-900">
          Zeitfenster pro Tag
        </label>

        <div v-if="selectedDays.length === 0" class="p-4 rounded-lg"
          :style="{
            backgroundColor: lightenColor(getBrandPrimary(), 0.95),
            borderColor: withAlpha(getBrandPrimary(), 0.2)
          }"
        >
          <p class="text-sm" :style="{ color: getBrandPrimary() }">👆 Wähle zunächst mindestens einen Tag aus</p>
        </div>

        <div v-else class="space-y-6">
          <div
            v-for="dayIndex in selectedDays"
            :key="dayIndex"
            class="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
          >
            <!-- Day Header -->
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900">{{ days[dayIndex] }}</h3>
              <button
                @click="removeDay(dayIndex)"
                class="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Entfernen
              </button>
            </div>

            <!-- Time Slots for this Day -->
            <div class="space-y-2">
              <div
                v-for="(slot, slotIndex) in getTimeSlotsForDay(dayIndex)"
                :key="`${dayIndex}-${slotIndex}`"
                class="flex items-center gap-2"
              >
                <input
                  v-model="slot.start_time"
                  type="time"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  :style="{ '--tw-ring-color': getBrandPrimary() }"
                  @change="validateTimeSlot(dayIndex, slotIndex)"
                />
                <span class="text-gray-500">–</span>
                <input
                  v-model="slot.end_time"
                  type="time"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  :style="{ '--tw-ring-color': getBrandPrimary() }"
                  @change="validateTimeSlot(dayIndex, slotIndex)"
                />
                <button
                  @click="removeTimeSlot(dayIndex, slotIndex)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Zeitfenster entfernen"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>

              <!-- Add Time Slot Button -->
              <button
                @click="addTimeSlot(dayIndex)"
                class="w-full mt-3 py-2 px-3 text-sm font-medium rounded-lg border transition-colors"
                :style="{
                  backgroundColor: lightenColor(getBrandPrimary(), 0.95),
                  borderColor: withAlpha(getBrandPrimary(), 0.2),
                  color: getBrandPrimary()
                }"
                :class="{
                  'hover:brightness-95': true
                }"
              >
                + Weiteres Zeitfenster hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Contact Information - Only show if user is NOT logged in -->
      <div v-if="!isUserLoggedIn" class="space-y-4">
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
          <!-- Street -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Strasse</label>
            <input
              v-model="street"
              type="text"
              placeholder="Musterstrasse"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>
          
          <!-- House Number -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nr.</label>
            <input
              v-model="houseNumber"
              type="text"
              placeholder="123"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Postal Code -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">PLZ</label>
            <input
              v-model="postalCode"
              type="text"
              placeholder="8000"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  :style="{ '--tw-ring-color': getBrandPrimary() }"
            />
          </div>
          
          <!-- City -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Ort</label>
            <input
              v-model="city"
              type="text"
              placeholder="Zürich"
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

      <!-- User Info Card - Only show if user IS logged in -->
      <div v-else class="p-4 rounded-lg"
        :style="{
          backgroundColor: lightenColor(getBrandPrimary(), 0.95),
          borderColor: withAlpha(getBrandPrimary(), 0.2)
        }"
      >
        <p class="text-sm" :style="{ color: getBrandPrimary() }">
          ✅ Anfrage wird erstellt mit deinen Kontaktdaten: <strong>{{ firstName }} {{ lastName }} ({{ email }})</strong>
        </p>
      </div>

      <!-- Notes -->
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-gray-900">
          Zusätzliche Bemerkungen (optional)
        </label>
        <textarea
          v-model="notes"
          placeholder="z.B. Flexible Zeiten, etc."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm resize-none"
          :style="{ '--tw-ring-color': getBrandPrimary() }"
          rows="3"
        />
      </div>

      <!-- Error Messages -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- Submit Button -->
      <button
        @click="submitProposal"
        :disabled="selectedDays.length === 0 || isSubmitting"
        :class="{
          'opacity-50 cursor-not-allowed': selectedDays.length === 0 || isSubmitting
        }"
        class="w-full py-3 px-4 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        :style="{
          backgroundColor: getBrandPrimary()
        }"
      >
        {{ isSubmitting ? 'Wird gespeichert...' : 'Anfrage absenden' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { logger } from '~/utils/logger'
import { useAuthStore } from '~/stores/auth'
import { getBrandPrimary, lightenColor, withAlpha } from '~/utils/colors'

const props = defineProps({
  tenant_id: {
    type: String,
    required: true
  },
  category: {
    type: Object,
    required: true
  },
  duration_minutes: {
    type: Number,
    required: false, // Not always required if proposal form is shown early
    default: 45 // Default to 45 minutes for proposals
  },
  location: {
    type: Object,
    required: true
  },
  staff: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['submitted'])

const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const selectedDays = ref<number[]>([])
const timeSlots = ref<Map<number, Array<{ start_time: string; end_time: string }>>>(new Map())
const notes = ref('')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const street = ref('')
const houseNumber = ref('')
const postalCode = ref('')
const city = ref('')
const error = ref('')
const isSubmitting = ref(false)

// Use Auth Store to check if user is logged in
const authStore = useAuthStore()
const isUserLoggedIn = computed(() => authStore.isLoggedIn)

// Pre-fill customer data if user is logged in
onMounted(() => {
  if (authStore.isLoggedIn && authStore.userProfile) {
    // Pre-fill customer data from user profile
    firstName.value = authStore.userProfile.first_name || ''
    lastName.value = authStore.userProfile.last_name || ''
    email.value = authStore.userProfile.email || ''
    phone.value = authStore.userProfile.phone || ''
    // Address fields are optional and may not be in userProfile
    street.value = (authStore.userProfile as any).street || ''
    houseNumber.value = (authStore.userProfile as any).house_number || ''
    postalCode.value = (authStore.userProfile as any).postal_code || ''
    city.value = (authStore.userProfile as any).city || ''
    
    logger.debug('✅ User logged in, pre-filling customer data', {
      email: email.value,
      firstName: firstName.value,
      lastName: lastName.value,
      street: street.value,
      houseNumber: houseNumber.value,
      postalCode: postalCode.value,
      city: city.value
    })
  }
})

const toggleDay = (dayIndex: number) => {
  if (selectedDays.value.includes(dayIndex)) {
    removeDay(dayIndex)
  } else {
    selectedDays.value.push(dayIndex)
    selectedDays.value.sort()
    // Initialize with one empty time slot
    if (!timeSlots.value.has(dayIndex)) {
      timeSlots.value.set(dayIndex, [{ start_time: '09:00', end_time: '10:00' }])
    }
  }
}

const removeDay = (dayIndex: number) => {
  selectedDays.value = selectedDays.value.filter(d => d !== dayIndex)
  timeSlots.value.delete(dayIndex)
}

// Format Swiss phone number automatically
const formatSwissPhoneNumber = (value: string): string => {
  // Remove all non-digit characters except + at the start
  let cleaned = value.replace(/[^\d+]/g, '')
  
  // If it starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  }
  
  // If it starts with 0 (but not 00), replace with +41
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+41' + cleaned.substring(1)
  }
  
  // Format: +41 79 123 45 67
  if (cleaned.startsWith('+41')) {
    const digits = cleaned.substring(3) // Remove +41
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

const getTimeSlotsForDay = (dayIndex: number) => {
  return timeSlots.value.get(dayIndex) || []
}

const addTimeSlot = (dayIndex: number) => {
  const slots = timeSlots.value.get(dayIndex) || []
  slots.push({ start_time: '09:00', end_time: '10:00' })
  timeSlots.value.set(dayIndex, slots)
}

const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
  const slots = timeSlots.value.get(dayIndex) || []
  slots.splice(slotIndex, 1)
  if (slots.length === 0) {
    removeDay(dayIndex)
  } else {
    timeSlots.value.set(dayIndex, slots)
  }
}

const validateTimeSlot = (dayIndex: number, slotIndex: number) => {
  const slots = timeSlots.value.get(dayIndex)
  if (!slots) return

  const slot = slots[slotIndex]
  if (slot.start_time >= slot.end_time) {
    error.value = 'Start-Zeit muss vor End-Zeit liegen'
    setTimeout(() => {
      error.value = ''
    }, 3000)
  }
}

const submitProposal = async () => {
  try {
    error.value = ''

    // Validate time slots
    if (selectedDays.value.length === 0) {
      error.value = 'Bitte wähle mindestens einen Tag'
      return
    }

    // Validate customer contact information (only required if NOT logged in)
    if (!isUserLoggedIn.value) {
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

      // Validate email format
      const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
      if (!emailRegex.test(email.value)) {
        error.value = 'Bitte geben Sie eine gültige Email-Adresse ein'
        return
      }

      if (!phone.value?.trim()) {
        error.value = 'Bitte geben Sie Ihre Telefonnummer an'
        return
      }

      if (!street.value?.trim()) {
        error.value = 'Bitte geben Sie Ihre Strasse an'
        return
      }

      if (!houseNumber.value?.trim()) {
        error.value = 'Bitte geben Sie Ihre Hausnummer an'
        return
      }

      if (!postalCode.value?.trim()) {
        error.value = 'Bitte geben Sie Ihre PLZ an'
        return
      }

      if (!city.value?.trim()) {
        error.value = 'Bitte geben Sie Ihren Ort an'
        return
      }

      // Validate phone format (basic Swiss format check)
      const phoneRegex = /^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/
      if (!phoneRegex.test(phone.value.replace(/\s/g, ''))) {
        error.value = 'Bitte geben Sie eine gültige Schweizer Telefonnummer ein (z.B. +41 79 123 45 67)'
        return
      }
    }

    // Build preferred_time_slots array
    const preferred_time_slots: any[] = []
    selectedDays.value.forEach(dayIndex => {
      const slots = timeSlots.value.get(dayIndex) || []
      slots.forEach(slot => {
        preferred_time_slots.push({
          day_of_week: dayIndex,
          start_time: slot.start_time,
          end_time: slot.end_time
        })
      })
    })

    isSubmitting.value = true

    // Submit proposal
    const response = await $fetch('/api/booking/submit-proposal', {
      method: 'POST',
      body: {
        tenant_id: props.tenant_id,
        category_code: props.category.code,
        duration_minutes: props.duration_minutes,
        location_id: props.location.id,
        staff_id: props.staff.id,
        preferred_time_slots,
        first_name: firstName.value?.trim() || null,
        last_name: lastName.value?.trim() || null,
        email: email.value?.trim() || null,
        phone: phone.value?.trim() || null,
        street: street.value?.trim() || null,
        house_number: houseNumber.value?.trim() || null,
        postal_code: postalCode.value?.trim() || null,
        city: city.value?.trim() || null,
        notes: notes.value.trim() || null,
        created_by_user_id: authStore.userProfile?.id || null
      }
    })

    if (response?.success) {
      logger.debug('✅ Booking proposal submitted:', (response as any).proposal_id)
      error.value = '' // Clear any previous errors
      emit('submitted', (response as any).proposal_id)
    }
  } catch (err: any) {
    logger.error('❌ Error submitting proposal:', err)
    error.value = err.data?.message || err.message || 'Fehler beim Absenden der Anfrage'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* No additional styles needed - Tailwind handles everything */
</style>
