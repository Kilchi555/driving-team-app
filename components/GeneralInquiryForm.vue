<template>
  <div
    class="inquiry-root relative"
    :style="rootStyle"
  >
    <div class="relative z-10 mx-auto w-full max-w-xl px-1 sm:px-0">
      <!-- Brand header -->
      <header class="inquiry-header mb-8 text-center sm:mb-10">
        <div v-if="resolvedLogo" class="inquiry-logo-wrap mb-4 inline-flex items-center justify-center">
          <img
            :src="resolvedLogo"
            :alt="resolvedTenantName || 'Logo'"
            class="inquiry-logo max-h-9 w-auto object-contain sm:max-h-10"
          />
        </div>
        <div
          v-else-if="resolvedTenantName"
          class="inquiry-logo-wrap mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow sm:h-11 sm:w-11 sm:text-base"
          :style="{ backgroundColor: brandPrimary }"
        >
          {{ tenantInitials }}
        </div>

        <h2 class="text-lg font-semibold text-slate-800 sm:text-xl">
          {{ formTitle }}
        </h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          {{ formDescription }}
        </p>
      </header>

      <!-- Form -->
      <form class="inquiry-form space-y-6" @submit.prevent="submitInquiry">
        <!-- Category / Location -->
        <div v-if="isSpecificRequest" class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              Fahrkategorie <span class="text-red-500">*</span>
            </label>
            <select
              v-model="selectedCategory"
              class="inquiry-field"
              :style="fieldFocusStyle"
            >
              <option value="">Wähle eine Kategorie…</option>
              <option v-for="cat in categories" :key="cat.code" :value="cat.code">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Mode choice when tenant enables multiple intake options -->
          <div v-if="availableIntakeModes.length > 1" class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              Wie möchtest du fortfahren? <span class="text-red-500">*</span>
            </label>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="opt in intakeModeOptions"
                :key="opt.value"
                type="button"
                class="inquiry-chip text-left"
                :class="{ 'inquiry-chip--active': locationIntakeMode === opt.value }"
                :style="locationIntakeMode === opt.value
                  ? { backgroundColor: brandPrimary, borderColor: brandPrimary, color: '#fff' }
                  : { borderColor: withAlphaLocal(brandPrimary, 0.28), color: brandPrimary, backgroundColor: withAlphaLocal(brandPrimary, 0.06) }"
                @click="selectedIntakeMode = opt.value"
              >
                <span class="block text-sm font-semibold">{{ opt.label }}</span>
                <span class="mt-0.5 block text-xs opacity-80">{{ opt.hint }}</span>
              </button>
            </div>
          </div>

          <div v-if="showLocationSelect" class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              Ort / Filiale <span class="text-red-500">*</span>
            </label>
            <select
              v-model="selectedLocation"
              class="inquiry-field"
              :class="{ 'opacity-60': !selectedCategory || isLoadingLocations }"
              :disabled="!selectedCategory || isLoadingLocations"
              :style="fieldFocusStyle"
            >
              <option value="">
                {{
                  !selectedCategory
                    ? 'Zuerst Kategorie wählen…'
                    : isLoadingLocations
                      ? 'Orte werden geladen…'
                      : locations.length === 0
                        ? 'Keine Orte für diese Kategorie'
                        : 'Wähle einen Ort…'
                }}
              </option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
            <p
              v-if="selectedCategory && !isLoadingLocations && locations.length === 0"
              class="text-xs text-amber-700"
            >
              Für diese Kategorie sind aktuell keine Orte hinterlegt.
            </p>
          </div>

          <div
            v-else-if="locationIntakeMode === 'callback'"
            class="rounded-2xl px-4 py-3 text-sm"
            :style="{
              backgroundColor: withAlphaLocal(brandPrimary, 0.08),
              color: brandPrimary,
            }"
          >
            Du musst keinen Treffpunkt wählen — wir rufen dich an und klären den Termin gemeinsam.
          </div>

          <div
            v-else-if="locationIntakeMode === 'pickup_address'"
            class="rounded-2xl px-4 py-3 text-sm"
            :style="{
              backgroundColor: withAlphaLocal(brandPrimary, 0.08),
              color: brandPrimary,
            }"
          >
            Gib unten deine Wunsch-Abholadresse an — wir holen dich dort ab.
          </div>

          <div v-if="selectedCategory" class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              Dauer <span class="text-red-500">*</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="duration in availableDurations"
                :key="duration"
                type="button"
                class="inquiry-chip"
                :class="{ 'inquiry-chip--active': selectedDuration === duration }"
                :style="selectedDuration === duration
                  ? { backgroundColor: brandPrimary, borderColor: brandPrimary, color: '#fff' }
                  : { borderColor: withAlphaLocal(brandPrimary, 0.28), color: brandPrimary, backgroundColor: withAlphaLocal(brandPrimary, 0.06) }"
                @click="selectedDuration = duration"
              >
                {{ duration }} Min.
              </button>
            </div>
          </div>

          <!-- Wochentage & Zeitfenster (wie BookingProposalForm) -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">
              Bevorzugte Tage <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="(dayName, dayIndex) in weekDays"
                :key="dayIndex"
                type="button"
                class="inquiry-chip text-center"
                :class="{ 'inquiry-chip--active': selectedDays.includes(dayIndex) }"
                :style="selectedDays.includes(dayIndex)
                  ? { backgroundColor: brandPrimary, borderColor: brandPrimary, color: '#fff' }
                  : { borderColor: withAlphaLocal(brandPrimary, 0.28), color: brandPrimary, backgroundColor: withAlphaLocal(brandPrimary, 0.06) }"
                @click="toggleDay(dayIndex)"
              >
                {{ dayName }}
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">
              Zeitfenster pro Tag <span class="text-red-500">*</span>
            </label>

            <div
              v-if="selectedDays.length === 0"
              class="rounded-2xl px-4 py-3 text-sm"
              :style="{
                backgroundColor: withAlphaLocal(brandPrimary, 0.08),
                color: brandPrimary,
              }"
            >
              Wähle zuerst mindestens einen Tag.
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="dayIndex in selectedDays"
                :key="dayIndex"
                class="space-y-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-slate-800">{{ weekDays[dayIndex] }}</h3>
                  <button
                    type="button"
                    class="text-xs font-medium text-red-600 hover:text-red-700"
                    @click="removeDay(dayIndex)"
                  >
                    Entfernen
                  </button>
                </div>

                <div
                  v-for="(slot, slotIndex) in getTimeSlotsForDay(dayIndex)"
                  :key="`${dayIndex}-${slotIndex}`"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model="slot.start_time"
                    type="time"
                    class="inquiry-field flex-1"
                    :style="fieldFocusStyle"
                    @change="validateTimeSlot(dayIndex, slotIndex)"
                  />
                  <span class="text-slate-400">–</span>
                  <input
                    v-model="slot.end_time"
                    type="time"
                    class="inquiry-field flex-1"
                    :style="fieldFocusStyle"
                    @change="validateTimeSlot(dayIndex, slotIndex)"
                  />
                  <button
                    type="button"
                    class="rounded-xl p-2 text-red-600 transition hover:bg-red-50"
                    title="Zeitfenster entfernen"
                    @click="removeTimeSlot(dayIndex, slotIndex)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  class="w-full rounded-xl border py-2 text-sm font-medium transition hover:brightness-95"
                  :style="{
                    backgroundColor: withAlphaLocal(brandPrimary, 0.06),
                    borderColor: withAlphaLocal(brandPrimary, 0.22),
                    color: brandPrimary,
                  }"
                  @click="addTimeSlot(dayIndex)"
                >
                  + Weiteres Zeitfenster
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact -->
        <div class="space-y-4">
          <p class="text-sm font-medium text-slate-700">
            Deine Kontaktdaten
            <span v-if="requiredFields.length" class="text-red-500">*</span>
          </p>

          <div
            v-if="isFieldVisible('first_name') || isFieldVisible('last_name')"
            class="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div v-if="isFieldVisible('first_name')" class="space-y-1.5">
              <label class="block text-xs text-slate-500">
                Vorname <span v-if="isFieldRequired('first_name')" class="text-red-500">*</span>
              </label>
              <input
                v-model="firstName"
                type="text"
                placeholder="Max"
                autocomplete="given-name"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
            <div v-if="isFieldVisible('last_name')" class="space-y-1.5">
              <label class="block text-xs text-slate-500">
                Nachname <span v-if="isFieldRequired('last_name')" class="text-red-500">*</span>
              </label>
              <input
                v-model="lastName"
                type="text"
                placeholder="Müller"
                autocomplete="family-name"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
          </div>

          <div
            v-if="isFieldVisible('email') || isFieldVisible('phone')"
            class="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div v-if="isFieldVisible('email')" class="space-y-1.5">
              <label class="block text-xs text-slate-500">
                E-Mail <span v-if="isFieldRequired('email')" class="text-red-500">*</span>
              </label>
              <input
                v-model="email"
                type="email"
                placeholder="max@example.com"
                autocomplete="email"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
            <div v-if="isFieldVisible('phone')" class="space-y-1.5">
              <label class="block text-xs text-slate-500">
                Telefon <span v-if="isFieldRequired('phone')" class="text-red-500">*</span>
              </label>
              <input
                v-model="phone"
                type="tel"
                placeholder="+41 79 123 45 67"
                autocomplete="tel"
                class="inquiry-field font-mono"
                :style="fieldFocusStyle"
                @input="onPhoneInput"
              />
            </div>
          </div>

          <div v-if="isFieldVisible('birthdate')" class="space-y-1.5 min-w-0">
            <label class="block text-xs text-slate-500">
              Geburtsdatum <span v-if="isFieldRequired('birthdate')" class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2 min-w-0">
              <select
                v-model="birthdateDay"
                class="inquiry-field min-w-0 text-sm px-2"
                :style="fieldFocusStyle"
                @change="syncBirthdateFromParts"
              >
                <option value="">Tag</option>
                <option v-for="d in 31" :key="d" :value="String(d).padStart(2, '0')">{{ d }}</option>
              </select>
              <select
                v-model="birthdateMonth"
                class="inquiry-field min-w-0 text-sm px-2"
                :style="fieldFocusStyle"
                @change="syncBirthdateFromParts"
              >
                <option value="">Monat</option>
                <option value="01">Jan</option>
                <option value="02">Feb</option>
                <option value="03">Mär</option>
                <option value="04">Apr</option>
                <option value="05">Mai</option>
                <option value="06">Jun</option>
                <option value="07">Jul</option>
                <option value="08">Aug</option>
                <option value="09">Sep</option>
                <option value="10">Okt</option>
                <option value="11">Nov</option>
                <option value="12">Dez</option>
              </select>
              <select
                v-model="birthdateYear"
                class="inquiry-field min-w-0 text-sm px-2"
                :style="fieldFocusStyle"
                @change="syncBirthdateFromParts"
              >
                <option value="">Jahr</option>
                <option v-for="y in birthdateYears" :key="y" :value="String(y)">{{ y }}</option>
              </select>
            </div>
          </div>

          <p
            v-if="addressSectionLabel && (isFieldVisible('street') || isFieldVisible('street_nr') || isFieldVisible('zip') || isFieldVisible('city'))"
            class="pt-1 text-sm font-medium text-slate-700"
          >
            {{ addressSectionLabel }}
            <span class="text-red-500">*</span>
          </p>

          <div
            v-if="isFieldVisible('street') || isFieldVisible('street_nr')"
            class="grid gap-3"
            :class="isFieldVisible('street') && isFieldVisible('street_nr') ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'"
          >
            <div v-if="isFieldVisible('street')" class="space-y-1.5">
              <label class="block text-xs text-slate-500">
                Strasse <span v-if="isFieldRequired('street')" class="text-red-500">*</span>
              </label>
              <input
                v-model="street"
                type="text"
                placeholder="Musterstrasse"
                autocomplete="address-line1"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
            <div v-if="isFieldVisible('street_nr')" class="w-24 space-y-1.5">
              <label class="block text-xs text-slate-500">
                Nr. <span v-if="isFieldRequired('street_nr')" class="text-red-500">*</span>
              </label>
              <input
                v-model="streetNr"
                type="text"
                placeholder="12"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
          </div>

          <div
            v-if="isFieldVisible('zip') || isFieldVisible('city')"
            class="grid gap-3"
            :class="isFieldVisible('zip') && isFieldVisible('city') ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'"
          >
            <div v-if="isFieldVisible('zip')" class="w-28 space-y-1.5">
              <label class="block text-xs text-slate-500">
                PLZ <span v-if="isFieldRequired('zip')" class="text-red-500">*</span>
              </label>
              <input
                v-model="zip"
                type="text"
                placeholder="8000"
                autocomplete="postal-code"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
            <div v-if="isFieldVisible('city')" class="space-y-1.5">
              <label class="block text-xs text-slate-500">
                Ort <span v-if="isFieldRequired('city')" class="text-red-500">*</span>
              </label>
              <input
                v-model="city"
                type="text"
                placeholder="Zürich"
                autocomplete="address-level2"
                class="inquiry-field"
                :style="fieldFocusStyle"
              />
            </div>
          </div>

          <div v-if="isFieldVisible('profession')" class="space-y-1.5">
            <label class="block text-xs text-slate-500">
              Beruf <span v-if="isFieldRequired('profession')" class="text-red-500">*</span>
            </label>
            <input
              v-model="profession"
              type="text"
              placeholder="z.B. Student"
              class="inquiry-field"
              :style="fieldFocusStyle"
            />
          </div>
        </div>

        <!-- Message -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-700">
            {{ messageLabel }}
            <span v-if="!isSpecificRequest" class="text-red-500">*</span>
            <span v-else class="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            v-model="message"
            :placeholder="messagePlaceholder"
            rows="3"
            maxlength="500"
            class="inquiry-field resize-none"
            :style="fieldFocusStyle"
          />
          <p class="text-right text-xs text-slate-400">{{ characterCount }}/500</p>
        </div>

        <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <!-- Honeypot -->
        <div aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;overflow:hidden;">
          <label for="_hp_inquiry">Website</label>
          <input id="_hp_inquiry" v-model="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" />
        </div>

        <button
          type="submit"
          :disabled="isSubmitting || !isFormValid"
          class="inquiry-submit group relative w-full overflow-hidden rounded-2xl py-3.5 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          :style="{ backgroundColor: brandPrimary }"
        >
          <span class="relative z-10">
            {{ isSubmitting ? 'Wird gesendet…' : 'Anfrage absenden' }}
          </span>
        </button>

        <p class="text-center text-xs text-slate-400">
          Wir melden uns in der Regel innerhalb eines Werktags.
        </p>
      </form>
    </div>

    <!-- Success Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="animate-scale-in w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div
              class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white"
              :style="{ backgroundColor: brandPrimary }"
            >
              ✓
            </div>
            <h3 class="text-xl font-bold text-slate-900">Danke für deine Anfrage!</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">
              Wir haben deine Nachricht erhalten und melden uns in Kürze bei dir.
            </p>
            <button
              class="mt-6 w-full rounded-2xl py-3 font-semibold text-white transition hover:brightness-110"
              :style="{ backgroundColor: brandPrimary }"
              @click="closeModal"
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
import { logger } from '~/utils/logger'
import { getBrandPrimary } from '~/utils/colors'

interface Category {
  id: number
  code: string
  name: string
  lesson_duration_minutes: number[] | number
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
  mode: {
    type: String,
    default: 'general',
    validator: (value: string) => ['general', 'booking'].includes(value)
  },
  primaryColor: {
    type: String,
    default: null
  },
  secondaryColor: {
    type: String,
    default: null
  },
  logoUrl: {
    type: String,
    default: null
  },
  tenantName: {
    type: String,
    default: null
  },
  requiredFields: {
    type: Array,
    default: () => ['first_name', 'last_name', 'phone', 'email']
  },
  optionalFields: {
    type: Array,
    default: () => []
  },
  locationIntakeModes: {
    type: Array,
    default: () => ['locations']
  },
  // Legacy singular prop still supported
  locationIntakeMode: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['submitted'])

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const birthdate = ref('')
const birthdateDay = ref('')
const birthdateMonth = ref('')
const birthdateYear = ref('')
const birthdateYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear - 14; y >= currentYear - 100; y--) years.push(y)
  return years
})
const syncBirthdateFromParts = () => {
  if (birthdateDay.value && birthdateMonth.value && birthdateYear.value) {
    birthdate.value = `${birthdateYear.value}-${birthdateMonth.value}-${birthdateDay.value}`
  } else {
    birthdate.value = ''
  }
}
const street = ref('')
const streetNr = ref('')
const zip = ref('')
const city = ref('')
const profession = ref('')
const message = ref('')
const honeypot = ref('')
const selectedCategory = ref(props.initial_category || '')
const selectedLocation = ref(props.initial_location || '')
const selectedDuration = ref(props.initial_duration || null)

// Same day indexing as BookingProposalForm: 0=Montag … 5=Samstag
const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const selectedDays = ref<number[]>([])
const timeSlots = ref<Map<number, Array<{ start_time: string; end_time: string }>>>(new Map())
const timeSlotsVersion = ref(0) // force re-render when Map mutates

const error = ref('')
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const categories = ref<Category[]>([])
const locations = ref<Location[]>([])
const isLoadingLocations = ref(false)

const isValidHex = (hex?: string | null) => !!hex && /^#([0-9a-fA-F]{6})$/.test(hex)

const brandPrimary = computed(() => {
  if (isValidHex(props.primaryColor)) return props.primaryColor as string
  return getBrandPrimary()
})

const resolvedLogo = computed(() => props.logoUrl || null)
const resolvedTenantName = computed(() => props.tenantName || null)

const tenantInitials = computed(() => {
  const name = resolvedTenantName.value || ''
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?'
})

const withAlphaLocal = (hex: string, alpha: number) => {
  if (!isValidHex(hex)) return `rgba(37, 99, 235, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const rootStyle = computed(() => ({
  '--inquiry-primary': brandPrimary.value,
  '--inquiry-primary-soft': withAlphaLocal(brandPrimary.value, 0.1),
  '--inquiry-primary-border': withAlphaLocal(brandPrimary.value, 0.22),
}))

const fieldFocusStyle = computed(() => ({
  '--tw-ring-color': brandPrimary.value,
}))

const isSpecificRequest = computed(() => props.mode === 'booking')

const availableIntakeModes = computed<Array<'locations' | 'pickup_address' | 'callback'>>(() => {
  const fromArray = ((props.locationIntakeModes || []) as string[]).filter((m): m is 'locations' | 'pickup_address' | 'callback' =>
    ['locations', 'pickup_address', 'callback'].includes(m)
  )
  if (fromArray.length > 0) return fromArray
  if (props.locationIntakeMode === 'pickup_address' || props.locationIntakeMode === 'callback' || props.locationIntakeMode === 'locations') {
    return [props.locationIntakeMode]
  }
  return ['locations']
})

const selectedIntakeMode = ref<'locations' | 'pickup_address' | 'callback' | null>(null)

const locationIntakeMode = computed<'locations' | 'pickup_address' | 'callback'>(() => {
  if (selectedIntakeMode.value && availableIntakeModes.value.includes(selectedIntakeMode.value)) {
    return selectedIntakeMode.value
  }
  // Prefer locations when available, else first enabled
  if (availableIntakeModes.value.includes('locations')) return 'locations'
  return availableIntakeModes.value[0] || 'locations'
})

const intakeModeOptions = computed(() => {
  const labels: Record<string, { label: string; hint: string }> = {
    locations: { label: 'Treffpunkt wählen', hint: 'Filiale / Standort auswählen' },
    pickup_address: { label: 'Abholung', hint: 'Wunsch-Abholadresse angeben' },
    callback: { label: 'Rückruf', hint: 'Wir rufen dich an' },
  }
  return availableIntakeModes.value.map(value => ({ value, ...labels[value] }))
})

watch(availableIntakeModes, (modes) => {
  if (!selectedIntakeMode.value || !modes.includes(selectedIntakeMode.value)) {
    selectedIntakeMode.value = modes.includes('locations') ? 'locations' : (modes[0] || 'locations')
  }
}, { immediate: true })

const showLocationSelect = computed(() =>
  isSpecificRequest.value && locationIntakeMode.value === 'locations'
)

const requiredFields = computed(() => {
  const base = [...((props.requiredFields || []) as string[])]
  if (locationIntakeMode.value === 'pickup_address') {
    for (const key of ['street', 'zip', 'city']) {
      if (!base.includes(key)) base.push(key)
    }
  }
  if (locationIntakeMode.value === 'callback') {
    if (!base.includes('phone')) base.push('phone')
  }
  return base
})

const optionalFields = computed(() => {
  const required = new Set(requiredFields.value)
  return ((props.optionalFields || []) as string[]).filter(k => !required.has(k))
})

const isFieldVisible = (key: string) =>
  requiredFields.value.includes(key) || optionalFields.value.includes(key)

const isFieldRequired = (key: string) => requiredFields.value.includes(key)

const addressSectionLabel = computed(() =>
  locationIntakeMode.value === 'pickup_address' ? 'Abholadresse' : null
)

const fieldValue = (key: string): string => {
  switch (key) {
    case 'first_name': return firstName.value
    case 'last_name': return lastName.value
    case 'email': return email.value
    case 'phone': return phone.value
    case 'birthdate': return birthdate.value
    case 'street': return street.value
    case 'street_nr': return streetNr.value
    case 'zip': return zip.value
    case 'city': return city.value
    case 'profession': return profession.value
    default: return ''
  }
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Vorname',
  last_name: 'Nachname',
  email: 'E-Mail',
  phone: 'Telefon',
  birthdate: 'Geburtsdatum',
  street: 'Strasse',
  street_nr: 'Hausnummer',
  zip: 'PLZ',
  city: 'Ort',
  profession: 'Beruf',
}

const formTitle = computed(() => {
  return isSpecificRequest.value
    ? 'Fahrstunde anfragen'
    : 'Schreib uns eine Nachricht'
})

const formDescription = computed(() => {
  if (!isSpecificRequest.value) {
    return 'Hast du Fragen? Wir freuen uns auf deine Nachricht.'
  }
  if (locationIntakeMode.value === 'callback') {
    return 'Hinterlasse deine Kontaktdaten — wir rufen dich an und finden einen passenden Termin.'
  }
  if (locationIntakeMode.value === 'pickup_address') {
    return 'Sag uns Kategorie, Wunschzeiten und Abholadresse — wir melden uns mit Vorschlägen.'
  }
  return 'Sag uns kurz, was du brauchst — wir melden uns mit passenden Terminen.'
})

const messageLabel = computed(() => {
  return isSpecificRequest.value ? 'Zusätzliche Bemerkungen' : 'Deine Nachricht'
})

const messagePlaceholder = computed(() => {
  return isSpecificRequest.value
    ? 'Optional: z.B. besondere Wünsche…'
    : 'Erzähl uns, worum es geht…'
})

const availableDurations = computed(() => {
  const category = categories.value.find(c => c.code === selectedCategory.value)
  const raw = category?.lesson_duration_minutes
  if (Array.isArray(raw) && raw.length) return raw
  if (typeof raw === 'number') return [raw]
  return [45]
})

const characterCount = computed(() => message.value.length)

const hasValidTimeSlots = computed(() => {
  // Depend on version so Map mutations invalidate this computed
  void timeSlotsVersion.value
  if (selectedDays.value.length === 0) return false
  return selectedDays.value.every((dayIndex) => {
    const slots = timeSlots.value.get(dayIndex) || []
    return slots.length > 0 && slots.every(s => s.start_time && s.end_time && s.start_time < s.end_time)
  })
})

const isFormValid = computed(() => {
  const requiredOk = requiredFields.value.every(key => !!fieldValue(key)?.trim())

  if (isFieldVisible('email') && email.value.trim()) {
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email.value)) return false
  }
  if (isFieldVisible('phone') && phone.value.trim()) {
    if (!/^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/.test(phone.value.replace(/\s/g, ''))) return false
  }

  if (isSpecificRequest.value) {
    const locationOk = showLocationSelect.value ? !!selectedLocation.value : true
    return !!(
      requiredOk
      && selectedCategory.value
      && locationOk
      && selectedDuration.value
      && hasValidTimeSlots.value
    )
  }

  return !!(requiredOk && message.value?.trim())
})

watch(locationIntakeMode, (mode) => {
  if (mode !== 'locations') {
    selectedLocation.value = ''
    locations.value = []
  } else if (selectedCategory.value) {
    loadLocationsForCategory(selectedCategory.value)
  }
})

watch(selectedCategory, () => {
  if (!availableDurations.value.includes(selectedDuration.value as number)) {
    selectedDuration.value = availableDurations.value[0] || null
  }
  selectedLocation.value = ''
  if (showLocationSelect.value && selectedCategory.value) {
    loadLocationsForCategory(selectedCategory.value)
  } else {
    locations.value = []
  }
})

const bumpTimeSlots = () => {
  timeSlotsVersion.value += 1
}

const toggleDay = (dayIndex: number) => {
  if (selectedDays.value.includes(dayIndex)) {
    removeDay(dayIndex)
  } else {
    selectedDays.value.push(dayIndex)
    selectedDays.value.sort((a, b) => a - b)
    if (!timeSlots.value.has(dayIndex)) {
      timeSlots.value.set(dayIndex, [{ start_time: '09:00', end_time: '17:00' }])
    }
    bumpTimeSlots()
  }
}

const removeDay = (dayIndex: number) => {
  selectedDays.value = selectedDays.value.filter(d => d !== dayIndex)
  timeSlots.value.delete(dayIndex)
  bumpTimeSlots()
}

const getTimeSlotsForDay = (dayIndex: number) => {
  void timeSlotsVersion.value
  return timeSlots.value.get(dayIndex) || []
}

const addTimeSlot = (dayIndex: number) => {
  const slots = timeSlots.value.get(dayIndex) || []
  slots.push({ start_time: '09:00', end_time: '17:00' })
  timeSlots.value.set(dayIndex, slots)
  bumpTimeSlots()
}

const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
  const slots = timeSlots.value.get(dayIndex) || []
  slots.splice(slotIndex, 1)
  if (slots.length === 0) {
    removeDay(dayIndex)
  } else {
    timeSlots.value.set(dayIndex, slots)
    bumpTimeSlots()
  }
}

const validateTimeSlot = (dayIndex: number, slotIndex: number) => {
  const slots = timeSlots.value.get(dayIndex)
  if (!slots) return
  const slot = slots[slotIndex]
  if (slot && slot.start_time >= slot.end_time) {
    error.value = 'Start-Zeit muss vor End-Zeit liegen'
    setTimeout(() => {
      if (error.value === 'Start-Zeit muss vor End-Zeit liegen') error.value = ''
    }, 3000)
  }
  bumpTimeSlots()
}

const buildPreferredTimeSlots = () => {
  const preferred: Array<{ day_of_week: number; start_time: string; end_time: string }> = []
  selectedDays.value.forEach((dayIndex) => {
    const slots = timeSlots.value.get(dayIndex) || []
    slots.forEach((slot) => {
      preferred.push({
        day_of_week: dayIndex,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })
    })
  })
  return preferred
}

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

const loadLocationsForCategory = async (categoryCode: string) => {
  if (!categoryCode) {
    locations.value = []
    return
  }

  isLoadingLocations.value = true
  try {
    const locationsRes = await $fetch<{ locations?: Location[] }>('/api/booking/get-locations', {
      query: {
        tenant_id: props.tenant_id,
        category_code: categoryCode,
      },
    })
    locations.value = locationsRes?.locations || []

    // Keep preselected location only if still valid for this category
    if (
      selectedLocation.value
      && !locations.value.some(loc => loc.id === selectedLocation.value)
    ) {
      selectedLocation.value = ''
    }
  } catch (err: any) {
    logger.warn('⚠️ Error loading locations for category:', err.message)
    locations.value = []
  } finally {
    isLoadingLocations.value = false
  }
}

const loadData = async () => {
  try {
    const categoriesRes = await $fetch<{ categories?: Category[] }>('/api/booking/get-categories', {
      query: { tenant_id: props.tenant_id },
    })

    if (categoriesRes?.categories) {
      categories.value = categoriesRes.categories
    }

    // If category was preselected (URL), load matching locations
    if (showLocationSelect.value && selectedCategory.value) {
      await loadLocationsForCategory(selectedCategory.value)
    }
  } catch (err: any) {
    logger.warn('⚠️ Error loading form data:', err.message)
  }
}

const submitInquiry = async () => {
  try {
    error.value = ''

    for (const key of requiredFields.value) {
      if (!fieldValue(key)?.trim()) {
        error.value = `Bitte geben Sie ${FIELD_LABELS[key] || key} an`
        return
      }
    }

    if (isFieldVisible('email') && email.value.trim()) {
      const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
      if (!emailRegex.test(email.value)) {
        error.value = 'Bitte geben Sie eine gültige Email-Adresse ein'
        return
      }
    }

    if (isFieldVisible('phone') && phone.value.trim()) {
      const phoneRegex = /^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/
      if (!phoneRegex.test(phone.value.replace(/\s/g, ''))) {
        error.value = 'Bitte geben Sie eine gültige Schweizer Telefonnummer ein (z.B. +41 79 123 45 67)'
        return
      }
    }

    if (isFieldVisible('zip') && zip.value.trim() && !/^\d{4}$/.test(zip.value.trim())) {
      error.value = 'Bitte geben Sie eine gültige PLZ ein (4 Ziffern)'
      return
    }

    if (!isSpecificRequest.value && !message.value?.trim()) {
      error.value = 'Bitte schreiben Sie eine Nachricht'
      return
    }

    if (isSpecificRequest.value) {
      if (!selectedCategory.value) {
        error.value = 'Bitte wählen Sie eine Fahrkategorie'
        return
      }

      if (showLocationSelect.value && !selectedLocation.value) {
        error.value = 'Bitte wählen Sie einen Ort'
        return
      }

      if (!selectedDuration.value) {
        error.value = 'Bitte wählen Sie eine Fahrstundendauer'
        return
      }

      if (!hasValidTimeSlots.value) {
        error.value = 'Bitte wählen Sie mindestens einen Tag mit gültigem Zeitfenster'
        return
      }
    }

    isSubmitting.value = true

    const extraNoteParts: string[] = []
    if (locationIntakeMode.value === 'callback') {
      extraNoteParts.push('Rückruf erwünscht')
    }
    if (locationIntakeMode.value === 'pickup_address' && (street.value.trim() || zip.value.trim() || city.value.trim())) {
      const addr = [street.value.trim(), streetNr.value.trim()].filter(Boolean).join(' ')
      const cityLine = [zip.value.trim(), city.value.trim()].filter(Boolean).join(' ')
      extraNoteParts.push(`Abholort: ${[addr, cityLine].filter(Boolean).join(', ')}`)
    }
    if (birthdate.value.trim()) extraNoteParts.push(`Geburtsdatum: ${birthdate.value.trim()}`)
    if (profession.value.trim()) extraNoteParts.push(`Beruf: ${profession.value.trim()}`)
    const baseNotes = message.value.trim()
    const combinedNotes = [...(baseNotes ? [baseNotes] : []), ...extraNoteParts].join('\n') || null

    const payload: any = {
      tenant_id: props.tenant_id,
      first_name: firstName.value.trim() || null,
      last_name: lastName.value.trim() || null,
      email: email.value.trim() || null,
      phone: phone.value.trim() || null,
      street: street.value.trim() || null,
      house_number: streetNr.value.trim() || null,
      postal_code: zip.value.trim() || null,
      city: city.value.trim() || null,
      birthdate: birthdate.value.trim() || null,
      profession: profession.value.trim() || null,
      notes: combinedNotes,
      location_intake_mode: locationIntakeMode.value,
      _hp: honeypot.value || undefined,
      marketing_session_id: (typeof window !== 'undefined' && (window as any).__analyticsSessionId) || undefined,
      marketing_attribution: (typeof window !== 'undefined' && (window as any).__marketingAttribution) || undefined,
    }

    if (isSpecificRequest.value) {
      payload.category_code = selectedCategory.value
      payload.location_id = showLocationSelect.value ? selectedLocation.value : null
      payload.duration_minutes = selectedDuration.value
      payload.staff_id = null
      payload.preferred_time_slots = buildPreferredTimeSlots()
    } else {
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
      logger.debug('✅ Inquiry submitted:', response.proposal_id)
      showSuccessModal.value = true

      setTimeout(() => {
        closeModal()
      }, 3000)

      emit('submitted', response.proposal_id)
    }
  } catch (err: any) {
    logger.error('❌ Error submitting inquiry:', err)
    error.value = err.data?.message || err.message || 'Fehler beim Absenden der Anfrage'
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  showSuccessModal.value = false
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  phone.value = ''
  birthdate.value = ''
  birthdateDay.value = ''
  birthdateMonth.value = ''
  birthdateYear.value = ''
  street.value = ''
  streetNr.value = ''
  zip.value = ''
  city.value = ''
  profession.value = ''
  message.value = ''
  selectedCategory.value = props.initial_category || ''
  selectedLocation.value = props.initial_location || ''
  selectedDuration.value = props.initial_duration || null
  selectedDays.value = []
  timeSlots.value = new Map()
  bumpTimeSlots()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.inquiry-root {
  position: relative;
  padding: 0.5rem 0 1.5rem;
  animation: inquiry-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.inquiry-logo-wrap {
  animation: inquiry-logo 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

.inquiry-header {
  animation: inquiry-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
}

.inquiry-form {
  animation: inquiry-enter 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
}

.inquiry-field {
  width: 100%;
  border-radius: 0.9rem;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.7rem 0.9rem;
  font-size: 0.925rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.inquiry-field:hover {
  border-color: var(--inquiry-primary-border);
}

.inquiry-field:focus {
  border-color: var(--inquiry-primary);
  box-shadow: 0 0 0 3px var(--inquiry-primary-soft);
  background: #fff;
}

.inquiry-chip {
  border-radius: 999px;
  border: 1.5px solid;
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.inquiry-chip:hover {
  transform: translateY(-1px);
}

.inquiry-chip--active {
  box-shadow: 0 8px 20px -12px var(--inquiry-primary);
}

.inquiry-submit:not(:disabled):hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.inquiry-submit:not(:disabled):active {
  transform: translateY(0);
}

@keyframes inquiry-enter {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes inquiry-logo {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

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
