<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6">
      <div class="text-center mb-4">
        <p class="text-xs uppercase tracking-wide text-gray-400">Alternative Anfrage</p>
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Deine bevorzugten Zeitfenster</h2>
        <div class="mt-2 text-sm text-gray-600">
          <p class="font-semibold">{{ staff?.first_name }} {{ staff?.last_name }} • {{ location?.name }}</p>
          <p class="text-xs">{{ category?.name }} • {{ duration_minutes }} Min.</p>
        </div>
      </div>
      <p class="text-center text-sm text-gray-600 mb-0">
        Leider haben wir für diese Kombination keine freien Termine im System. 
        Bitte teile uns deine bevorzugten Zeitfenster mit und wir kontaktieren dich schnellstmöglich!
      </p>
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
              'bg-blue-500 text-white border-blue-600': selectedDays.includes(dayIndex),
              'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300': !selectedDays.includes(dayIndex)
            }"
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

        <div v-if="selectedDays.length === 0" class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-700">👆 Wähle zunächst mindestens einen Tag aus</p>
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
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  @change="validateTimeSlot(dayIndex, slotIndex)"
                />
                <span class="text-gray-500">–</span>
                <input
                  v-model="slot.end_time"
                  type="time"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                class="w-full mt-3 py-2 px-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
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
              placeholder="z.B. Max"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <!-- Last Name -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Nachname</label>
            <input
              v-model="lastName"
              type="text"
              placeholder="z.B. Müller"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              placeholder="z.B. max@example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <!-- Phone -->
          <div>
            <label class="block text-xs text-gray-600 mb-1">Telefon</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="z.B. +41 79 123 45 67"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      <!-- User Info Card - Only show if user IS logged in -->
      <div v-else class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="text-sm text-blue-900">
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
          placeholder="z.B. Flexible Zeiten, Fahrzeug-Vorlieben, etc."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
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
        class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isSubmitting ? 'Wird gespeichert...' : 'Anfrage absenden' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { logger } from '~/utils/logger'
import { useAuth } from '#auth'

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
const error = ref('')
const isSubmitting = ref(false)
const currentUser = ref<any>(null)
const isUserLoggedIn = computed(() => !!currentUser.value)

// Load current user on mount
onMounted(async () => {
  try {
    const { data: { session } } = await useAuth().getCurrentSession?.() || { data: {} }
    if (session?.user) {
      currentUser.value = session.user
      // Pre-fill customer data if user is logged in
      if (session.user.user_metadata) {
        firstName.value = session.user.user_metadata.first_name || ''
        lastName.value = session.user.user_metadata.last_name || ''
      }
      email.value = session.user.email || ''
      
      logger.debug('✅ User logged in, pre-filling customer data', {
        email: email.value,
        firstName: firstName.value,
        lastName: lastName.value
      })
    }
  } catch (err) {
    logger.warn('⚠️ Could not load user session:', err)
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

      // Validate phone format (basic Swiss format check)
      const phoneRegex = /^(?:\+41|0)\d{2}(?:\s?\d{3}){2}(?:\s?\d{2})$/
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
        notes: notes.value.trim() || null,
        created_by_user_id: currentUser.value?.id || null
      }
    })

    if (response?.success) {
      logger.debug('✅ Booking proposal submitted:', response.proposal_id)
      error.value = '' // Clear any previous errors
      emit('submitted', response.proposal_id)
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
