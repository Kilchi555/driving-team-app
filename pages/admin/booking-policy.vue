<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-2">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center" :style="primaryBgLight">
        <svg class="w-5 h-5" :style="primaryText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-gray-900">Buchung & Schüler-Onboarding</h1>
        <p class="text-sm text-gray-500">Definiere, was beim Erstellen neuer Schüler erfasst wird und wie Bestätigungen versendet werden.</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-16 text-gray-400 gap-2">
      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Einstellungen werden geladen…
    </div>

    <template v-else>
      <!-- ── Section 1: Felder ── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Felder bei Schüler-Erstellung</h2>
          <p class="text-xs text-gray-400 mt-0.5">Klicke ein Feld mehrfach, um zwischen «aus», «optional» und «Pflicht» zu wechseln.</p>
        </div>

        <!-- Legend -->
        <div class="px-5 pt-3 flex items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-gray-400">
            <span class="w-4 h-4 rounded border-2 border-gray-200 bg-white inline-block"></span> Aus
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-500">
            <span class="w-4 h-4 rounded border-2 border-gray-400 bg-white inline-block flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
            </span> Optional
          </span>
          <span class="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
            <span class="w-4 h-4 rounded border-2 border-transparent inline-block" :style="primaryBg"></span> Pflicht
          </span>
        </div>

        <div class="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            v-for="field in availableFields"
            :key="field.key"
            type="button"
            @click="cycleField(field.key)"
            class="flex items-center gap-2.5 text-left select-none rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <!-- State indicator -->
            <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              :class="fieldState(field.key) === 'hidden' ? 'border-gray-200 bg-white' : ''"
              :style="fieldState(field.key) === 'required'
                ? primaryBg
                : fieldState(field.key) === 'optional'
                  ? { borderColor: '#9ca3af', background: 'white' }
                  : {}"
            >
              <!-- Pflicht: checkmark -->
              <svg v-if="fieldState(field.key) === 'required'" class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <!-- Optional: dot -->
              <span v-else-if="fieldState(field.key) === 'optional'" class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            </div>
            <span class="text-sm" :class="fieldState(field.key) === 'hidden' ? 'text-gray-400' : 'text-gray-700'">
              {{ field.label }}
              <span v-if="fieldState(field.key) === 'optional'" class="text-xs text-gray-400 ml-0.5">(opt.)</span>
              <span v-else-if="fieldState(field.key) === 'required'" class="text-xs text-red-400 ml-0.5">*</span>
            </span>
          </button>
        </div>
        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <p class="text-xs text-gray-400">Mindestens ein Name ist immer erforderlich. Telefon ist nur nötig wenn Onboarding-SMS aktiv ist.</p>
        </div>
      </div>

      <!-- ── Section 2: Bestätigungs-E-Mail ── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Terminbestätigungen versenden</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler erhalten nach jedem gebuchten Termin eine Bestätigungs-E-Mail — sofern eine E-Mail-Adresse bekannt ist.</p>
          </div>
          <button
            type="button"
            @click="policy.confirmation_email_enabled = !policy.confirmation_email_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ml-4"
            :style="policy.confirmation_email_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.confirmation_email_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- ── Section 4: Onboarding SMS ── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Onboarding-SMS versenden</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler erhalten beim Erstellen automatisch einen SMS-Link zur Kontoaktivierung.</p>
          </div>
          <button
            type="button"
            @click="policy.onboarding_sms_enabled = !policy.onboarding_sms_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :style="policy.onboarding_sms_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.onboarding_sms_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- ── Section 5: Registrierungs-Erinnerung ── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">Registrierungs-Erinnerung</h2>
            <p class="text-xs text-gray-400 mt-0.5">Schüler, die sich noch nicht registriert haben, erhalten automatisch eine Erinnerung.</p>
          </div>
          <button
            type="button"
            @click="policy.registration_reminder_enabled = !policy.registration_reminder_enabled"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :style="policy.registration_reminder_enabled ? primaryBg : { background: '#e5e7eb' }"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="policy.registration_reminder_enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div v-if="policy.registration_reminder_enabled" class="px-5 py-4 space-y-4">
          <!-- Delay -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Erinnerung senden nach</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="policy.registration_reminder_days"
                type="number"
                min="1"
                max="90"
                class="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <span class="text-sm text-gray-500">Tagen (falls noch nicht registriert)</span>
            </div>
          </div>

          <!-- Channels -->
          <div class="space-y-2">
            <p class="text-xs font-medium text-gray-500">Kanal</p>

            <label class="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200">
              <div class="flex items-center gap-2.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-700">E-Mail</p>
                  <p class="text-xs text-gray-400">Nur wenn E-Mail-Adresse bekannt</p>
                </div>
              </div>
              <button
                type="button"
                @click="policy.registration_reminder_email_enabled = !policy.registration_reminder_email_enabled"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                :style="policy.registration_reminder_email_enabled ? primaryBg : { background: '#e5e7eb' }"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="policy.registration_reminder_email_enabled ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </label>

            <label class="flex items-center justify-between py-2.5 px-3.5 rounded-xl border border-gray-100 cursor-pointer hover:border-gray-200">
              <div class="flex items-center gap-2.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-700">SMS</p>
                  <p class="text-xs text-gray-400">Enthält personalisierten Registrierungslink</p>
                </div>
              </div>
              <button
                type="button"
                @click="policy.registration_reminder_sms_enabled = !policy.registration_reminder_sms_enabled"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                :style="policy.registration_reminder_sms_enabled ? primaryBg : { background: '#e5e7eb' }"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="policy.registration_reminder_sms_enabled ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </label>
          </div>
        </div>
      </div>

      <!-- ── Section 6: Staff Rückerstattungen ── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-800">Rückerstattungen durch Staff</h2>
          <p class="text-xs text-gray-400 mt-0.5">Definiere, ob Staff Rückerstattungen für abgeschlossene Wallee-Zahlungen auslösen darf.</p>
        </div>
        <div class="px-5 py-4 space-y-2">
          <label
            v-for="option in refundPermissionOptions"
            :key="option.value"
            class="flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-colors"
            :class="policy.staff_refund_permission === option.value
              ? 'border-transparent'
              : 'border-gray-100 hover:border-gray-200'"
            :style="policy.staff_refund_permission === option.value ? { borderColor: 'var(--color-primary, #3B82F6)', background: 'var(--color-primary-bg, #EFF6FF)' } : {}"
            @click="policy.staff_refund_permission = option.value"
          >
            <span class="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
              :style="policy.staff_refund_permission === option.value
                ? { borderColor: 'var(--color-primary, #3B82F6)' }
                : { borderColor: '#d1d5db' }"
            >
              <span v-if="policy.staff_refund_permission === option.value"
                class="w-2 h-2 rounded-full"
                :style="{ background: 'var(--color-primary, #3B82F6)' }"
              />
            </span>
            <div>
              <p class="text-sm font-medium text-gray-800">{{ option.label }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ option.description }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex items-center justify-end gap-3 pt-1">
        <p v-if="saveSuccess" class="text-sm text-green-600 font-medium flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Gespeichert
        </p>
        <button
          @click="savePolicy"
          :disabled="isSaving"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60"
          :style="primaryBg"
        >
          <svg v-if="isSaving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ isSaving ? 'Speichert…' : 'Einstellungen speichern' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePrimaryColor } from '~/composables/usePrimaryColor'
import { useUIStore } from '~/stores/ui'

definePageMeta({ layout: 'admin' })

const { primaryBg, primaryText, primaryBgLight } = usePrimaryColor()
const uiStore = useUIStore()

const isLoading = ref(true)
const isSaving = ref(false)
const saveSuccess = ref(false)

const policy = ref({
  student_required_fields: ['first_name', 'last_name', 'phone'] as string[],
  student_optional_fields: [] as string[],
  confirmation_email_enabled: true,
  registration_reminder_enabled: false,
  registration_reminder_days: 7,
  registration_reminder_email_enabled: true,
  registration_reminder_sms_enabled: true,
  onboarding_sms_enabled: true,
  staff_refund_permission: 'hidden' as 'hidden' | 'request' | 'allowed',
})

const refundPermissionOptions = [
  {
    value: 'hidden',
    label: 'Nicht sichtbar',
    description: 'Staff sieht keine Rückerstattungs-Option. Nur Admins können Rückerstattungen auslösen.',
  },
  {
    value: 'request',
    label: 'Antrag stellen',
    description: 'Staff kann einen Antrag stellen. Der Admin wird benachrichtigt und muss genehmigen.',
  },
  {
    value: 'allowed',
    label: 'Direkt erstatten',
    description: 'Staff kann Rückerstattungen direkt und ohne Admin-Genehmigung auslösen.',
  },
]

const availableFields = [
  { key: 'first_name', label: 'Vorname', locked: false },
  { key: 'last_name', label: 'Nachname', locked: false },
  { key: 'phone', label: 'Telefon', locked: false },
  { key: 'email', label: 'E-Mail', locked: false },
  { key: 'birthdate', label: 'Geburtsdatum', locked: false },
  { key: 'street', label: 'Strasse', locked: false },
  { key: 'street_nr', label: 'Hausnummer', locked: false },
  { key: 'zip', label: 'PLZ', locked: false },
  { key: 'city', label: 'Ort', locked: false },
  { key: 'profession', label: 'Beruf', locked: false },
]


// Returns 'hidden' | 'optional' | 'required'
const fieldState = (key: string): 'hidden' | 'optional' | 'required' => {
  if (policy.value.student_required_fields.includes(key)) return 'required'
  if (policy.value.student_optional_fields.includes(key)) return 'optional'
  return 'hidden'
}

// Cycle: hidden → optional → required → hidden
const cycleField = (key: string) => {
  const state = fieldState(key)
  policy.value.student_required_fields = policy.value.student_required_fields.filter(f => f !== key)
  policy.value.student_optional_fields = policy.value.student_optional_fields.filter(f => f !== key)

  if (state === 'hidden') {
    policy.value.student_optional_fields = [...policy.value.student_optional_fields, key]
  } else if (state === 'optional') {
    policy.value.student_required_fields = [...policy.value.student_required_fields, key]
  }
  // required → hidden: already removed above
}

const loadPolicy = async () => {
  try {
    const res = await $fetch<{ success: boolean; policy: typeof policy.value }>('/api/admin/booking-policy')
    if (res.policy) {
      policy.value = { ...policy.value, ...res.policy }
    }
  } catch (err: any) {
    uiStore.addNotification({ type: 'error', title: 'Fehler', message: 'Einstellungen konnten nicht geladen werden.' })
  } finally {
    isLoading.value = false
  }
}

const savePolicy = async () => {
  isSaving.value = true
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/booking-policy', {
      method: 'POST',
      body: policy.value,
    })
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
    uiStore.addNotification({ type: 'success', title: 'Gespeichert', message: 'Buchungsrichtlinien wurden aktualisiert.' })
  } catch (err: any) {
    uiStore.addNotification({ type: 'error', title: 'Fehler', message: 'Einstellungen konnten nicht gespeichert werden.' })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => loadPolicy())
</script>
