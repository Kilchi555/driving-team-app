<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-primary-600 rounded-xl p-6 sm:p-8 text-center">
      <p class="text-xs uppercase tracking-widest text-primary-200 font-semibold mb-1">Kursanmeldung</p>
      <h2 class="text-2xl sm:text-3xl font-bold text-white">{{ formTitle }}</h2>
      <p class="text-primary-100 text-sm mt-2">{{ formDescription }}</p>
    </div>

    <!-- Form Card -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6 space-y-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- First Name -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Vorname <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.first_name"
            type="text"
            name="firstName"
            autocomplete="given-name"
            placeholder="z.B. Max"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p v-if="errors.first_name" class="text-red-500 text-xs">{{ errors.first_name }}</p>
        </div>

        <!-- Last Name -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Nachname <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.last_name"
            type="text"
            name="lastName"
            autocomplete="family-name"
            placeholder="z.B. Mustermann"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p v-if="errors.last_name" class="text-red-500 text-xs">{{ errors.last_name }}</p>
        </div>

        <!-- Company (optional) -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Firma (optional)
          </label>
          <input
            v-model="form.company"
            type="text"
            name="company"
            autocomplete="organization"
            placeholder="z.B. Muster AG"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
          />
        </div>

        <!-- Email -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            E-Mail <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="max@example.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p v-if="errors.email" class="text-red-500 text-xs">{{ errors.email }}</p>
        </div>

        <!-- Phone -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Telefon <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.phone"
            type="tel"
            name="tel"
            autocomplete="tel"
            placeholder="+41 44 431 00 33"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p v-if="errors.phone" class="text-red-500 text-xs">{{ errors.phone }}</p>
        </div>

        <!-- Birthdate -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Geburtsdatum <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.birthdate"
            type="date"
            name="birthdate"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p v-if="errors.birthdate" class="text-red-500 text-xs">{{ errors.birthdate }}</p>
        </div>

        <!-- FaBer ID (Führerausweis Nummer) -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Führerausweis-Nummer (FaBer) <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.faberid"
            type="text"
            name="faberid"
            placeholder="z.B. 1234567890"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p class="text-gray-500 text-xs">Zu finden auf der Rückseite des Führerscheins</p>
          <p v-if="errors.faberid" class="text-red-500 text-xs">{{ errors.faberid }}</p>
        </div>

        <!-- Address -->
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-900">
              Strasse <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.street"
              type="text"
              name="street"
              autocomplete="street-address"
              placeholder="z.B. Musterstrasse"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
              required
            />
          </div>
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-900">
              Nr. <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.street_nr"
              type="text"
              name="streetNumber"
              placeholder="z.B. 42"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-900">
              PLZ <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.zip"
              type="text"
              name="zip"
              autocomplete="postal-code"
              placeholder="z.B. 8000"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
              required
            />
          </div>
          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-900">
              Ort <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.city"
              type="text"
              name="city"
              autocomplete="address-level2"
              placeholder="z.B. Zürich"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
              required
            />
          </div>
        </div>

        <!-- Kursdaten (nur wenn vorhanden) -->
        <div v-if="props.available_dates && props.available_dates.length > 0" class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Kursdaten <span class="text-red-500">*</span>
          </label>
          <p class="text-gray-500 text-xs">Wähle einen oder mehrere Termine aus:</p>
          <div class="space-y-2">
            <label
              v-for="date in props.available_dates"
              :key="date"
              class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
              :class="{ 'border-primary-400 bg-primary-50': form.selected_dates.includes(date) }"
            >
              <input
                type="checkbox"
                :value="date"
                v-model="form.selected_dates"
                class="w-4 h-4 rounded accent-primary-600"
              />
              <span class="text-sm text-gray-800">{{ date }}</span>
            </label>
          </div>
          <p v-if="errors.selected_dates" class="text-red-500 text-xs">{{ errors.selected_dates }}</p>
        </div>

        <!-- Notes -->
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Zusätzliche Bemerkungen (optional)
          </label>
          <textarea
            v-model="form.notes"
            placeholder="z.B. spezielle Anforderungen oder Fragen..."
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
          />
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full py-3 px-4 rounded-lg font-semibold transition text-white"
          :style="{ backgroundColor: isSubmitting ? '#ccc' : getBrandPrimary() }"
        >
          {{ isSubmitting ? 'Wird versendet...' : 'Anmeldung absenden' }}
        </button>
      </form>
    </div>

    <!-- Success Message (shown briefly before modal closes) -->
    <Transition name="fade">
      <div v-if="showSuccess" class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p class="text-green-700 font-semibold">✓ Anmeldung erfolgreich eingereicht!</p>
        <p class="text-green-600 text-sm mt-1">Wir werden dich in Kürze kontaktieren.</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  birthdate: string
  faberid: string
  street: string
  street_nr: string
  zip: string
  city: string
  company?: string
  notes?: string
  selected_dates: string[]
}

interface FormErrors {
  [key: string]: string | null
}

const props = defineProps<{
  tenant_id: string
  custom_title?: string
  custom_description?: string
  course_type: string
  available_dates?: string[] // e.g. ['15. März 2026', '22. März 2026']
}>()

const emit = defineEmits<{
  submitted: []
}>()

const form = ref<FormData>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthdate: '',
  faberid: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  company: '',
  notes: '',
  selected_dates: [],
})

const errors = ref<FormErrors>({})
const isSubmitting = ref(false)
const showSuccess = ref(false)

const formTitle = computed(() => props.custom_title || 'Kursanmeldung')
const formDescription = computed(
  () => props.custom_description || 'Füllen Sie das Formular aus, um sich anzumelden.'
)

function getBrandPrimary(): string {
  return 'rgb(59, 130, 246)' // primary-600
}

function validateForm(): boolean {
  errors.value = {}

  if (!form.value.first_name?.trim()) {
    errors.value.first_name = 'Vorname ist erforderlich'
  }
  if (!form.value.last_name?.trim()) {
    errors.value.last_name = 'Nachname ist erforderlich'
  }
  if (!form.value.email?.trim()) {
    errors.value.email = 'E-Mail ist erforderlich'
  } else if (!form.value.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.value.email = 'Ungültiges E-Mail Format'
  }
  if (!form.value.phone?.trim()) {
    errors.value.phone = 'Telefon ist erforderlich'
  }
  if (!form.value.birthdate?.trim()) {
    errors.value.birthdate = 'Geburtsdatum ist erforderlich'
  }
  if (!form.value.faberid?.trim()) {
    errors.value.faberid = 'Führerausweis-Nummer ist erforderlich'
  }
  if (!form.value.street?.trim()) {
    errors.value.street = 'Strasse ist erforderlich'
  }
  if (!form.value.street_nr?.trim()) {
    errors.value.street_nr = 'Hausnummer ist erforderlich'
  }
  if (!form.value.zip?.trim()) {
    errors.value.zip = 'PLZ ist erforderlich'
  }
  if (!form.value.city?.trim()) {
    errors.value.city = 'Ort ist erforderlich'
  }
  if (props.available_dates && props.available_dates.length > 0 && form.value.selected_dates.length === 0) {
    errors.value.selected_dates = 'Bitte wähle mindestens einen Kurstermin aus'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      tenant_id: props.tenant_id,
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      email: form.value.email,
      phone: form.value.phone,
      birthdate: form.value.birthdate,
      faberid: form.value.faberid,
      street: form.value.street,
      street_nr: form.value.street_nr,
      zip: form.value.zip,
      city: form.value.city,
      course_type: props.course_type,
      company: form.value.company,
      notes: form.value.notes,
      course_dates: form.value.selected_dates.length > 0 ? form.value.selected_dates : undefined,
    }

    const response = await fetch('/api/courses/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      showSuccess.value = true
      emit('submitted')
    }
  } catch (err) {
    console.error('Error submitting form:', err)
    errors.value._submit = 'Fehler beim Absenden. Bitte versuchen Sie es später erneut.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
