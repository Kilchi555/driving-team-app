<template>
  <div class="space-y-6 relative">
    <!-- Header -->
    <div class="bg-primary-600 rounded-xl p-6 sm:p-8 text-center">
      <p class="text-xs uppercase tracking-widest text-primary-200 font-semibold mb-1">Kursanmeldung</p>
      <h2 class="text-2xl sm:text-3xl font-bold text-white">{{ formTitle }}</h2>
      <p class="text-white text-sm mt-2">{{ formDescription }}</p>
    </div>

    <!-- Form Card -->
    <div class="bg-white shadow rounded-lg p-4 sm:p-6 space-y-6">
      <form
        @submit.prevent="handleSubmit"
        method="post"
        autocomplete="on"
        name="course-registration"
        class="space-y-6"
      >
        <!-- First Name -->
        <div class="space-y-3">
          <label for="course-reg-given-name" class="block text-sm font-semibold text-gray-900">
            Vorname <span class="text-red-500">*</span>
          </label>
          <input
            id="course-reg-given-name"
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
          <label for="course-reg-family-name" class="block text-sm font-semibold text-gray-900">
            Nachname <span class="text-red-500">*</span>
          </label>
          <input
            id="course-reg-family-name"
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
          <label for="course-reg-organization" class="block text-sm font-semibold text-gray-900">
            Firma (optional)
          </label>
          <input
            id="course-reg-organization"
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
          <label for="course-reg-email" class="block text-sm font-semibold text-gray-900">
            E-Mail <span class="text-red-500">*</span>
          </label>
          <input
            id="course-reg-email"
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
          <label for="course-reg-tel" class="block text-sm font-semibold text-gray-900">
            Telefon <span class="text-red-500">*</span>
          </label>
          <input
            id="course-reg-tel"
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
        <div v-if="props.show_faber_birthdate !== false" class="space-y-3">
          <label for="course-reg-bday" class="block text-sm font-semibold text-gray-900">
            Geburtsdatum <span class="text-red-500">*</span>
          </label>
          <input
            id="course-reg-bday"
            v-model="form.birthdate"
            type="date"
            name="birthdate"
            autocomplete="bday"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
            required
          />
          <p v-if="errors.birthdate" class="text-red-500 text-xs">{{ errors.birthdate }}</p>
        </div>

        <!-- FaBer ID (Führerausweis Nummer) -->
        <div v-if="props.show_faber_birthdate !== false" class="space-y-3">
          <label for="course-reg-faberid" class="block text-sm font-semibold text-gray-900">
            Führerausweis-Nummer <span class="text-red-500">*</span>
          </label>
          <input
            id="course-reg-faberid"
            v-model="form.faberid"
            type="text"
            name="faberid"
            autocomplete="off"
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
            <label for="course-reg-address-line1" class="block text-sm font-semibold text-gray-900">
              Strasse <span class="text-red-500">*</span>
            </label>
            <input
              id="course-reg-address-line1"
              v-model="form.street"
              type="text"
              name="street"
              autocomplete="address-line1"
              placeholder="z.B. Musterstrasse"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
              required
            />
          </div>
          <div class="space-y-3">
            <label for="course-reg-address-line2" class="block text-sm font-semibold text-gray-900">
              Nr. <span class="text-red-500">*</span>
            </label>
            <input
              id="course-reg-address-line2"
              v-model="form.street_nr"
              type="text"
              name="streetNumber"
              autocomplete="address-line2"
              placeholder="z.B. 42"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
              :style="{ '--tw-ring-color': getBrandPrimary() }"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-3">
            <label for="course-reg-postal-code" class="block text-sm font-semibold text-gray-900">
              PLZ <span class="text-red-500">*</span>
            </label>
            <input
              id="course-reg-postal-code"
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
            <label for="course-reg-city" class="block text-sm font-semibold text-gray-900">
              Ort <span class="text-red-500">*</span>
            </label>
            <input
              id="course-reg-city"
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

        <!-- Kursdaten: API-Slots, Legacy-Termine, oder Interessenanmeldung -->
        <div
          v-if="instancesLoading"
          class="rounded-lg bg-gray-50 border border-gray-200 p-4 flex gap-3"
        >
          <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-gray-600">Kurstermine werden geladen …</p>
        </div>

        <div v-else-if="hasSlotList && bookableSlots.length > 0" class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Kursdaten <span class="text-red-500">*</span>
          </label>
          <p class="text-gray-500 text-xs">Wähle einen oder mehrere Termine aus:</p>
          <div class="space-y-2">
            <label
              v-for="slot in props.course_slots"
              :key="slot.id"
              class="flex items-center gap-3 p-3 border rounded-lg transition"
              :class="slotSoldOut(slot)
                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                : form.selected_course_ids.includes(slot.id)
                  ? 'border-primary-400 bg-primary-50 cursor-pointer'
                  : 'border-gray-200 cursor-pointer hover:bg-gray-50'"
            >
              <input
                type="checkbox"
                :value="slot.id"
                v-model="form.selected_course_ids"
                :disabled="slotSoldOut(slot)"
                class="w-4 h-4 rounded accent-primary-600"
              />
              <span class="text-sm flex-1" :class="slotSoldOut(slot) ? 'text-gray-400 line-through' : 'text-gray-800'">{{ slot.label }}</span>
              <span v-if="slotSoldOut(slot)" class="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Ausgebucht</span>
              <span v-else-if="slot.spots_remaining != null" class="text-xs text-gray-500">noch {{ slot.spots_remaining }} Plätze</span>
            </label>
          </div>
          <p v-if="errors.selected_dates" class="text-red-500 text-xs">{{ errors.selected_dates }}</p>
        </div>

        <div v-else-if="hasSlotList && bookableSlots.length === 0" class="rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
          <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-amber-900">
            <strong>Aktuell ausgebucht:</strong> Für diesen Kurs sind alle öffentlichen Termine voll. Du kannst unten eine Interessenanmeldung absenden — wir melden uns bei dir.
          </p>
        </div>

        <div v-else-if="hasDateList" class="space-y-3">
          <label class="block text-sm font-semibold text-gray-900">
            Kursdaten <span class="text-red-500">*</span>
          </label>
          <p class="text-gray-500 text-xs">Wähle einen oder mehrere Termine aus:</p>
          <div class="space-y-2">
            <label
              v-for="date in props.available_dates"
              :key="date"
              class="flex items-center gap-3 p-3 border rounded-lg transition"
              :class="isSoldOut(date)
                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                : form.selected_dates.includes(date)
                  ? 'border-primary-400 bg-primary-50 cursor-pointer'
                  : 'border-gray-200 cursor-pointer hover:bg-gray-50'"
            >
              <input
                type="checkbox"
                :value="date"
                v-model="form.selected_dates"
                :disabled="isSoldOut(date)"
                class="w-4 h-4 rounded accent-primary-600"
              />
              <span class="text-sm flex-1" :class="isSoldOut(date) ? 'text-gray-400 line-through' : 'text-gray-800'">{{ date }}</span>
              <span v-if="isSoldOut(date)" class="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Ausgebucht</span>
              <span v-else-if="remainingSpots(date) !== null" class="text-xs text-gray-500">noch {{ remainingSpots(date) }} Plätze</span>
            </label>
          </div>
          <p v-if="errors.selected_dates" class="text-red-500 text-xs">{{ errors.selected_dates }}</p>
        </div>

        <!-- Hinweis wenn keine Kursdaten vorhanden -->
        <div v-else class="rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
          <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-blue-800">
            <strong>Interessenanmeldung:</strong> Mit dem Absenden dieses Formulars meldest du dein Interesse an. Sobald die Kursdaten feststehen, werden wir dich umgehend kontaktieren.
          </p>
        </div>

        <!-- Notes -->
        <div class="space-y-3">
          <label for="course-reg-notes" class="block text-sm font-semibold text-gray-900">
            Zusätzliche Bemerkungen (optional)
          </label>
          <textarea
            id="course-reg-notes"
            v-model="form.notes"
            name="notes"
            autocomplete="off"
            placeholder="z.B. spezielle Anforderungen oder Fragen..."
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
            :style="{ '--tw-ring-color': getBrandPrimary() }"
          />
        </div>

        <p v-if="errors._submit" class="text-red-600 text-sm">{{ errors._submit }}</p>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isSubmitting || instancesLoading"
          class="w-full py-3 px-4 rounded-lg font-semibold transition text-white"
          :style="{ backgroundColor: (isSubmitting || instancesLoading) ? '#ccc' : getBrandPrimary() }"
        >
          {{ isSubmitting ? 'Wird versendet...' : instancesLoading ? 'Kurstermine laden …' : 'Anmeldung absenden' }}
        </button>
      </form>
    </div>

    <!-- Success Modal via Teleport -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showSuccess"
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
        >
          <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-10 text-center animate-scale-in">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">Anmeldung erfolgreich!</h3>
            <p class="text-gray-600 mb-2">Vielen Dank für deine Anmeldung.</p>
            <p class="text-gray-500 text-sm">Wir melden uns in Kürze bei dir.</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CourseSlotOption } from '~/components/CoursePickerModal.vue'
import type { CourseRegistrationContactPrefill } from '~/utils/course-registration-prefill'

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
  selected_course_ids: string[]
}

interface FormErrors {
  [key: string]: string | null
}

const props = defineProps<{
  tenant_id: string
  custom_title?: string
  custom_description?: string
  course_type: string
  available_dates?: string[]
  sold_out_dates?: string[]
  spots_per_date?: Record<string, number>
  course_slots?: CourseSlotOption[]
  /** Wenn true: keine Terminwahl / Absenden bis die Kursliste da ist (z. B. Fahrlehrer-API) */
  instancesLoading?: boolean
  location?: string
  start_time?: string
  show_faber_birthdate?: boolean
  /** z. B. aus URL-Query — füllt nur noch leere Felder (kein Überschreiben bei Tippfehler-Korrektur) */
  initial_contact?: CourseRegistrationContactPrefill
}>()

const emit = defineEmits<{
  submitted: [selectedDates?: string[]]
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
  selected_course_ids: [],
})

const errors = ref<FormErrors>({})
const isSubmitting = ref(false)
const showSuccess = ref(false)

const formTitle = computed(() => props.custom_title || 'Kursanmeldung')

const instancesLoading = computed(() => props.instancesLoading === true)

watch(
  () => props.custom_title,
  () => {
    form.value.selected_course_ids = []
    form.value.selected_dates = []
  },
)

type ContactFormKey = keyof CourseRegistrationContactPrefill

function mergeInitialContact(src?: CourseRegistrationContactPrefill) {
  if (!src) return
  const f = form.value as FormData & Record<string, unknown>
  const keys: ContactFormKey[] = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'birthdate',
    'faberid',
    'street',
    'street_nr',
    'zip',
    'city',
    'company',
    'notes',
  ]
  for (const key of keys) {
    const v = src[key]
    if (v == null || String(v).trim() === '') continue
    const cur = f[key]
    if (typeof cur === 'string' && cur.trim() !== '') continue
    f[key] = String(v).trim()
  }
}

watch(
  () => props.initial_contact,
  c => mergeInitialContact(c),
  { immediate: true, deep: true },
)

function slotSoldOut(slot: CourseSlotOption): boolean {
  if (slot.sold_out) return true
  if (slot.spots_remaining !== undefined && slot.spots_remaining <= 0) return true
  return false
}

const hasSlotList = computed(() => Array.isArray(props.course_slots) && props.course_slots.length > 0)

const bookableSlots = computed(() => (props.course_slots || []).filter(s => !slotSoldOut(s)))

const hasDateList = computed(
  () => !hasSlotList.value && !!(props.available_dates && props.available_dates.length > 0),
)

function isSoldOut(date: string): boolean {
  return (props.sold_out_dates || []).includes(date)
}

function remainingSpots(date: string): number | null {
  if (!props.spots_per_date) return null
  if (!(date in props.spots_per_date)) return null
  return props.spots_per_date[date]
}
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
  if (props.show_faber_birthdate !== false) {
    if (!form.value.birthdate?.trim()) {
      errors.value.birthdate = 'Geburtsdatum ist erforderlich'
    }
    if (!form.value.faberid?.trim()) {
      errors.value.faberid = 'Führerausweis-Nummer ist erforderlich'
    }
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
  if (!instancesLoading.value && hasSlotList.value && bookableSlots.value.length > 0) {
    const picked = form.value.selected_course_ids.filter(id =>
      bookableSlots.value.some(s => s.id === id),
    )
    if (picked.length === 0) {
      errors.value.selected_dates = 'Bitte wähle mindestens einen Kurstermin aus'
    }
  }
  else if (!instancesLoading.value && hasDateList.value && form.value.selected_dates.length === 0) {
    errors.value.selected_dates = 'Bitte wähle mindestens einen Kurstermin aus'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (instancesLoading.value) {
    return
  }
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    let course_ids: string[] | undefined
    let course_dates: string[] | undefined

    if (hasSlotList.value && bookableSlots.value.length > 0) {
      const ids = form.value.selected_course_ids.filter(id =>
        bookableSlots.value.some(s => s.id === id),
      )
      if (ids.length > 0) {
        course_ids = ids
        course_dates = ids
          .map(id => props.course_slots!.find(s => s.id === id)?.label)
          .filter(Boolean) as string[]
      }
    }
    else if (hasDateList.value && form.value.selected_dates.length > 0) {
      course_dates = [...form.value.selected_dates]
    }

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
      course_title: props.custom_title?.replace(/^Anmeldung:\s*/i, '').replace(/^Anfrage:\s*/i, '').trim(),
      company: form.value.company,
      notes: form.value.notes,
      course_ids,
      course_dates,
      location: props.location,
      start_time: props.start_time,
    }

    const response = await fetch('/api/courses/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const msg = typeof data?.statusMessage === 'string'
        ? data.statusMessage
        : typeof data?.message === 'string'
          ? data.message
          : `Anfrage fehlgeschlagen (${response.status})`
      throw new Error(msg)
    }

    if (data.success) {
      showSuccess.value = true
      const submittedLabels = course_dates?.length ? [...course_dates] : undefined
      emit('submitted', submittedLabels)
    }
  } catch (err: unknown) {
    console.error('Error submitting form:', err)
    const msg = err instanceof Error ? err.message : ''
    errors.value._submit = msg && msg.length < 200
      ? msg
      : 'Fehler beim Absenden. Bitte versuchen Sie es später erneut.'
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

<style>
@keyframes scale-in {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
</style>
