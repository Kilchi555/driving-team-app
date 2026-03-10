<template>
  <div>
    <!-- Trigger Slot oder Default Button -->
    <slot :open="openModal">
      <button
        @click="openModal"
        class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg"
      >
        ✨ Jetzt Termin buchen
      </button>
    </slot>

    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showModal"
          class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          @click.self="closeModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

            <!-- Header -->
            <div class="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 class="text-xl font-bold">Was möchtest du buchen?</h2>
                <p class="text-primary-100 text-sm mt-1">Wähle den passenden Typ für deine Anfrage</p>
              </div>
              <button
                @click="closeModal"
                class="text-white hover:bg-white/20 rounded-lg p-2 transition"
                aria-label="Schliessen"
              >
                ✕
              </button>
            </div>

            <!-- Step 1: Typ wählen -->
            <div v-if="!selectedType" class="p-6 space-y-4">
              <button
                v-for="type in bookingTypes"
                :key="type.id"
                @click="selectType(type.id)"
                class="w-full flex items-start gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition duration-200 text-left group"
              >
                <div class="text-4xl mt-0.5 flex-shrink-0">{{ type.icon }}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-bold text-gray-900 text-base">{{ type.label }}</p>
                    <span
                      v-if="type.badge"
                      class="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      :class="type.badgeColor"
                    >
                      {{ type.badge }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">{{ type.description }}</p>
                  <div v-if="type.details" class="flex flex-wrap gap-3 mt-2">
                    <span
                      v-for="detail in type.details"
                      :key="detail"
                      class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                    >
                      {{ detail }}
                    </span>
                  </div>
                </div>
                <span class="text-primary-400 group-hover:text-primary-600 text-xl transition mt-1 flex-shrink-0">→</span>
              </button>
            </div>

            <!-- Step 2a: Fahrlektion → Simy öffnen -->
            <div v-if="selectedType === 'fahrlektionen'" class="p-6 text-center space-y-4">
              <div class="text-5xl mb-2">🚗</div>
              <h3 class="text-xl font-bold text-gray-900">Online-Termin buchen</h3>
              <p class="text-gray-600 text-sm">Du wirst zu unserem Buchungssystem weitergeleitet, wo du direkt einen verfügbaren Termin wählen und buchen kannst.</p>
              <div class="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <span class="text-green-500">✓</span> Sofortige Bestätigung
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <span class="text-green-500">✓</span> Freie Wahl des Fahrlehrers
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <span class="text-green-500">✓</span> Alle verfügbaren Zeiten sofort sichtbar
                </div>
              </div>
              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  @click="openSimy"
                  class="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition"
                >
                  🗓 Zum Buchungssystem →
                </button>
                <button
                  @click="selectedType = null"
                  class="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition"
                >
                  ← Zurück
                </button>
              </div>
            </div>

            <!-- Step 2b: Theorie / Beratung → Inquiry Form -->
            <div v-if="selectedType === 'theorie' || selectedType === 'beratung'" class="p-6 space-y-4">
              <!-- Typ-Info -->
              <div class="flex items-center gap-3 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                <span class="text-3xl">{{ activeType?.icon }}</span>
                <div>
                  <p class="font-bold text-primary-900">{{ activeType?.label }}</p>
                  <p class="text-sm text-primary-700">{{ activeType?.formSubtitle }}</p>
                  <div class="flex gap-3 mt-1">
                    <span
                      v-for="detail in activeType?.details"
                      :key="detail"
                      class="text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded"
                    >
                      {{ detail }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Inline Inquiry Form -->
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Vorname <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.firstName"
                      type="text"
                      placeholder="Max"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    />
                    <p v-if="formTouched && !form.firstName.trim()" class="text-xs text-red-500 mt-1">Pflichtfeld</p>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Nachname <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.lastName"
                      type="text"
                      placeholder="Müller"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    />
                    <p v-if="formTouched && !form.lastName.trim()" class="text-xs text-red-500 mt-1">Pflichtfeld</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.email"
                      type="email"
                      placeholder="max@example.com"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                    />
                    <p v-if="formTouched && !isValidEmail" class="text-xs text-red-500 mt-1">Gültige Email erforderlich</p>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Telefon <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.phone"
                      type="tel"
                      placeholder="+41 79 123 45 67"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-primary-500"
                    />
                    <p v-if="formTouched && !form.phone.trim()" class="text-xs text-red-500 mt-1">Pflichtfeld</p>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1">
                    {{ selectedType === 'theorie' ? 'Was möchtest du üben?' : 'Worum geht es bei der Beratung?' }}
                    <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    v-model="form.message"
                    rows="3"
                    :placeholder="activeType?.messagePlaceholder"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500 resize-none"
                  />
                  <p v-if="formTouched && !form.message.trim()" class="text-xs text-red-500 mt-1">Pflichtfeld</p>
                </div>
              </div>

              <!-- Error -->
              <div v-if="submitError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ❌ {{ submitError }}
              </div>

              <!-- Success -->
              <div v-if="submitSuccess" class="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <p class="text-2xl mb-2">✅</p>
                <p class="font-bold text-green-800">Anfrage gesendet!</p>
                <p class="text-sm text-green-700 mt-1">Wir melden uns in Kürze bei dir.</p>
              </div>

              <!-- Actions -->
              <div v-if="!submitSuccess" class="flex flex-col sm:flex-row gap-3">
                <button
                  @click="submitInquiry"
                  :disabled="isSubmitting"
                  class="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition"
                >
                  {{ isSubmitting ? 'Wird gesendet...' : '📩 Anfrage senden' }}
                </button>
                <button
                  @click="selectedType = null"
                  :disabled="isSubmitting"
                  class="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition"
                >
                  ← Zurück
                </button>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  tenantId: string
  categoryCode?: string  // optional: vorgewählte Kategorie (z.B. 'auto-b')
  simySlug?: string      // optional: override für Simy slug
}>()

type BookingTypeId = 'fahrlektionen' | 'theorie' | 'beratung'

interface BookingType {
  id: BookingTypeId
  icon: string
  label: string
  description: string
  badge?: string
  badgeColor?: string
  details?: string[]
  formSubtitle?: string
  messagePlaceholder?: string
}

const bookingTypes: BookingType[] = [
  {
    id: 'fahrlektionen',
    icon: '🚗',
    label: 'Fahrlektionen',
    description: 'Buche direkt online eine Fahrstunde mit einem verfügbaren Fahrlehrer.',
    badge: 'Sofort buchbar',
    badgeColor: 'bg-green-100 text-green-700',
    details: ['45 min', '90 min', 'Alle Kategorien'],
  },
  {
    id: 'theorie',
    icon: '📚',
    label: 'Theorie',
    description: 'Gezielte Vorbereitung auf die Theorieprüfung – persönlich oder online.',
    details: ['45 min', 'CHF 85.–'],
    formSubtitle: 'Wir melden uns für einen Termin',
    messagePlaceholder: 'z.B. Ich möchte mich auf die Theorieprüfung vorbereiten. Bevorzugte Zeiten: ...',
  },
  {
    id: 'beratung',
    icon: '🤝',
    label: 'Kostenlose Beratung',
    description: 'Wir beraten dich unverbindlich zu deiner Fahrausbildung – ohne Verpflichtung.',
    badge: 'Kostenlos',
    badgeColor: 'bg-blue-100 text-blue-700',
    details: ['30 min', 'CHF 0.–'],
    formSubtitle: 'Unverbindliche Beratung – kostenlos',
    messagePlaceholder: 'z.B. Ich möchte wissen, was ich für den Motorrad-Führerschein brauche...',
  },
]

// Modal State
const showModal = ref(false)
const selectedType = ref<BookingTypeId | null>(null)

// Form State
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  message: '',
})
const formTouched = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const activeType = computed(() =>
  bookingTypes.find(t => t.id === selectedType.value)
)

const isValidEmail = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)
)

const isFormValid = computed(() =>
  form.value.firstName.trim() &&
  form.value.lastName.trim() &&
  isValidEmail.value &&
  form.value.phone.trim() &&
  form.value.message.trim()
)

const openModal = () => {
  showModal.value = true
  selectedType.value = null
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  showModal.value = false
  document.body.style.overflow = ''
  setTimeout(() => {
    selectedType.value = null
    submitSuccess.value = false
    submitError.value = ''
    formTouched.value = false
    form.value = { firstName: '', lastName: '', email: '', phone: '', message: '' }
  }, 300)
}

const selectType = (type: BookingTypeId) => {
  selectedType.value = type
  submitSuccess.value = false
  submitError.value = ''
  formTouched.value = false
}

const openSimy = () => {
  const slug = props.simySlug || 'driving-team'
  const url = props.categoryCode
    ? `https://simy.ch/booking/availability/${slug}?service=${props.categoryCode}`
    : `https://simy.ch/booking/availability/${slug}`
  window.open(url, '_blank', 'noopener,noreferrer')
  closeModal()
}

const submitInquiry = async () => {
  formTouched.value = true
  if (!isFormValid.value) return

  try {
    isSubmitting.value = true
    submitError.value = ''

    const serviceLabel = activeType.value?.label || selectedType.value

    await $fetch('/api/booking/submit-general-inquiry', {
      method: 'POST',
      body: {
        tenant_id: props.tenantId,
        first_name: form.value.firstName.trim(),
        last_name: form.value.lastName.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim(),
        notes: `[${serviceLabel}]\n\n${form.value.message.trim()}`,
        category_code: null,
        location_id: null,
        duration_minutes: selectedType.value === 'theorie' ? 45 : selectedType.value === 'beratung' ? 30 : null,
        staff_id: null,
        preferred_time_slots: [],
      },
    })

    submitSuccess.value = true
    setTimeout(() => {
      closeModal()
    }, 3000)
  } catch (err: any) {
    submitError.value = err.data?.message || err.message || 'Fehler beim Absenden. Bitte versuche es erneut.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
