<!-- components/AddStudentModal.vue -->
<template>
  <!-- Toast Notification -->
  <Toast
    :show="showToast"
    :type="toastType"
    :title="toastTitle"
    :message="toastMessage"
    :duration="3000"
    @close="showToast = false"
  />

  <!-- Duplicate Warning Modal (higher z-index) -->
  <div v-if="showDuplicateWarning" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
    <div class="absolute inset-0 bg-black/40" @click="showDuplicateWarning = false"></div>

    <div class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full mx-0 sm:mx-4 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">{{ duplicateInfo.title }}</h2>
        <button
          @click="showDuplicateWarning = false"
          class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 space-y-4">
        <p class="text-sm text-gray-600">{{ duplicateInfo.message }}</p>

        <!-- Action Instructions -->
        <div class="rounded-xl p-4" :style="primaryBgLight">
          <p class="text-sm font-medium mb-2" :style="primaryText">{{ duplicateInfo.actionTitle }}</p>
          <ul class="text-sm space-y-1 list-disc list-inside text-gray-600">
            <li v-for="(action, index) in duplicateInfo.actions" :key="index">{{ action }}</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-100">
        <button
          @click="showDuplicateWarning = false"
          class="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Schliessen
        </button>

        <div class="flex items-center gap-2">
          <!-- Pending: resend SMS -->
          <button
            v-if="duplicateInfo.duplicateStatus === 'pending'"
            @click="resendOnboardingSmsFromModal"
            :disabled="isSendingResendSms"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            :style="primaryBg"
          >
            <svg v-if="isSendingResendSms" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isSendingResendSms ? 'Wird gesendet...' : 'SMS erneut senden' }}
          </button>

          <!-- Active / inactive: open profile -->
          <button
            v-if="duplicateInfo.existingUser?.id && duplicateInfo.duplicateStatus !== 'pending'"
            @click="openStudentProfile"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            :style="primaryBg"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Profil öffnen
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Student Modal -->
  <div v-if="show" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40" @click="$emit('close')"></div>

    <!-- Modal -->
    <div class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full mx-0 sm:mx-4 max-h-[92vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Neuer Schüler</h2>
        <button
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitForm" class="overflow-y-auto flex-1">
        <div class="px-6 py-5 space-y-4">
          <!-- Info Banner -->
          <div class="flex items-center gap-2 text-xs px-3 py-2 rounded-xl" :style="{ ...primaryBgLight, ...primaryText }">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>
              Mindestens Vor- oder Nachname erforderlich.
              <template v-if="!bookingPolicy.onboarding_sms_enabled"> Onboarding-SMS ist deaktiviert.</template>
            </span>
          </div>

          <!-- Vorname / Nachname -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="firstName" class="block text-xs font-medium text-gray-500 mb-1">
                Vorname<span v-if="isFieldRequired('first_name')" class="text-red-400 ml-0.5">*</span>
              </label>
              <input
                id="firstName"
                v-model="form.first_name"
                type="text"
                placeholder="Max"
                class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
                :class="errors.first_name ? 'border-red-300' : 'border-gray-200'"
              >
              <p v-if="errors.first_name" class="text-red-500 text-xs mt-1">{{ errors.first_name }}</p>
            </div>
            <div>
              <label for="lastName" class="block text-xs font-medium text-gray-500 mb-1">
                Nachname<span v-if="isFieldRequired('last_name')" class="text-red-400 ml-0.5">*</span>
              </label>
              <input
                id="lastName"
                v-model="form.last_name"
                type="text"
                placeholder="Mustermann"
                class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
                :class="errors.last_name ? 'border-red-300' : 'border-gray-200'"
              >
              <p v-if="errors.last_name" class="text-red-500 text-xs mt-1">{{ errors.last_name }}</p>
            </div>
          </div>

          <!-- Telefon -->
          <div v-if="isFieldRequired('phone') || true">
            <label for="phone" class="block text-xs font-medium text-gray-500 mb-1">
              Telefonnummer<span v-if="isFieldRequired('phone')" class="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              placeholder="+41 79 123 45 67"
              class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
              :class="errors.phone ? 'border-red-300' : 'border-gray-200'"
            >
            <p v-if="errors.phone" class="text-red-500 text-xs mt-1">{{ errors.phone }}</p>
          </div>

          <!-- E-Mail -->
          <div v-if="isFieldRequired('email') || bookingPolicy.confirmation_email_enabled">
            <label for="email" class="block text-xs font-medium text-gray-500 mb-1">
              E-Mail<span v-if="isFieldRequired('email')" class="text-red-400 ml-0.5">*</span>
              <span v-else class="text-gray-400 font-normal ml-1">(für Terminbestätigung)</span>
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="max@beispiel.ch"
              class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
              :class="errors.email ? 'border-red-300' : 'border-gray-200'"
            >
            <p v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</p>
          </div>

          <!-- Geburtsdatum -->
          <div v-if="isFieldRequired('birthdate')">
            <label for="birthdate" class="block text-xs font-medium text-gray-500 mb-1">
              Geburtsdatum<span class="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="birthdate"
              v-model="form.birthdate"
              type="date"
              class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
              :class="errors.birthdate ? 'border-red-300' : 'border-gray-200'"
            >
            <p v-if="errors.birthdate" class="text-red-500 text-xs mt-1">{{ errors.birthdate }}</p>
          </div>

          <!-- Adresse (nur wenn mind. ein Adressfeld required) -->
          <template v-if="isFieldRequired('street') || isFieldRequired('zip') || isFieldRequired('city')">
            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">
                  Strasse<span v-if="isFieldRequired('street')" class="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  v-model="form.street"
                  type="text"
                  placeholder="Hauptstrasse"
                  class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
                  :class="errors.street ? 'border-red-300' : 'border-gray-200'"
                >
                <p v-if="errors.street" class="text-red-500 text-xs mt-1">{{ errors.street }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Nr.</label>
                <input
                  v-model="form.street_nr"
                  type="text"
                  placeholder="12"
                  class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900 border-gray-200"
                >
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">
                  PLZ<span v-if="isFieldRequired('zip')" class="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  v-model="form.zip"
                  type="text"
                  placeholder="8000"
                  maxlength="4"
                  class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
                  :class="errors.zip ? 'border-red-300' : 'border-gray-200'"
                >
                <p v-if="errors.zip" class="text-red-500 text-xs mt-1">{{ errors.zip }}</p>
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">
                  Ort<span v-if="isFieldRequired('city')" class="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  v-model="form.city"
                  type="text"
                  placeholder="Zürich"
                  class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900"
                  :class="errors.city ? 'border-red-300' : 'border-gray-200'"
                >
                <p v-if="errors.city" class="text-red-500 text-xs mt-1">{{ errors.city }}</p>
              </div>
            </div>
          </template>

          <!-- Beruf -->
          <div v-if="isFieldRequired('profession')">
            <label class="block text-xs font-medium text-gray-500 mb-1">
              Beruf<span class="text-red-400 ml-0.5">*</span>
            </label>
            <input
              v-model="form.profession"
              type="text"
              placeholder="Kaufmann/Kauffrau"
              class="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900 border-gray-200"
            >
          </div>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
          <button
            type="button"
            @click="$emit('close')"
            class="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || !isFormValid"
            class="relative overflow-hidden flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed min-w-[168px]"
            :style="isFormValid ? primaryBg : {}"
            :class="[
              isFormValid && !isSubmitting ? 'text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : '',
              !isFormValid ? 'bg-gray-200 text-gray-400' : '',
              isSubmitting ? 'text-white opacity-90 pointer-events-none' : ''
            ]"
          >
            <!-- Shimmer sweep while loading -->
            <div
              v-if="isSubmitting"
              class="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full"
              style="animation: btn-shimmer 1.4s ease-in-out infinite"
            />

            <!-- Icon: spinner ↔ send arrow -->
            <transition name="btn-icon" mode="out-in">
              <svg v-if="isSubmitting" key="spin" class="w-4 h-4 flex-shrink-0" style="animation: spin 0.8s linear infinite" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
                <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg v-else key="send" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </transition>

            <!-- Text: animated dots ↔ label -->
            <transition name="btn-text" mode="out-in">
              <span v-if="isSubmitting" key="loading" class="flex items-center">
                Speichert
                <span class="inline-flex ml-0.5">
                  <span class="opacity-0" style="animation: dot-bounce 1.2s ease-in-out infinite 0ms">.</span>
                  <span class="opacity-0" style="animation: dot-bounce 1.2s ease-in-out infinite 200ms">.</span>
                  <span class="opacity-0" style="animation: dot-bounce 1.2s ease-in-out infinite 400ms">.</span>
                </span>
              </span>
              <span v-else key="idle">{{ bookingPolicy.onboarding_sms_enabled ? 'Einladen & Speichern' : 'Schüler erstellen' }}</span>
            </transition>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePrimaryColor } from '~/composables/usePrimaryColor'
const { primaryBg, primaryText, primaryBgLight } = usePrimaryColor()
import { useUIStore } from '~/stores/ui'
import { logger } from '~/utils/logger'
import Toast from '~/components/Toast.vue'

const uiStore = useUIStore()
const router = useRouter()

// ── Booking policy ──────────────────────────────────────────────────────────
const bookingPolicy = ref({
  student_required_fields: ['first_name', 'last_name', 'phone'] as string[],
  onboarding_sms_enabled: true,
  confirmation_email_enabled: true,
})

const isFieldRequired = (key: string) => bookingPolicy.value.student_required_fields.includes(key)

onMounted(async () => {
  try {
    const res = await $fetch<{ policy: typeof bookingPolicy.value }>('/api/admin/booking-policy')
    if (res?.policy) bookingPolicy.value = { ...bookingPolicy.value, ...res.policy }
  } catch { /* non-critical, use defaults */ }
})

// ✅ NEU: Toast State
const showToast = ref(false)
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success')
const toastTitle = ref('')
const toastMessage = ref('')

// Toast Helper Functions
const showSuccessToast = (title: string, message: string = '') => {
  logger.debug('🔔 showSuccessToast called:', { title, message })
  toastType.value = 'success'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  logger.debug('🔔 Toast state updated:', { showToast: showToast.value })
}

const showWarningToast = (title: string, message: string = '') => {
  logger.debug('🔔 showWarningToast called:', { title, message })
  toastType.value = 'warning'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  logger.debug('🔔 Toast state updated:', { showToast: showToast.value })
}

const emit = defineEmits<{
  close: []
  added: [student: any]
}>()

// Props
interface Props {
  show: boolean
  currentUser: any | null
}

const props = defineProps<Props>()

// State
const isSubmitting = ref(false)
const isSendingResendSms = ref(false)

const openStudentProfile = () => {
  const studentId = duplicateInfo.value.existingUser?.id
  if (studentId) {
    emit('close')
    showDuplicateWarning.value = false
    router.push(`/customers?student=${studentId}`)
  }
}

const resendOnboardingSmsFromModal = async () => {
  const student = duplicateInfo.value.existingUser
  if (!student?.id) return

  isSendingResendSms.value = true
  try {
    await $fetch('/api/students/resend-onboarding-sms', {
      method: 'POST',
      body: { studentId: student.id }
    })
    uiStore.addNotification({
      type: 'success',
      title: 'SMS gesendet',
      message: `Onboarding-SMS wurde erneut an ${student.first_name} gesendet.`
    })
    showDuplicateWarning.value = false
  } catch (err: any) {
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: err?.data?.statusMessage || 'SMS konnte nicht gesendet werden.'
    })
  } finally {
    isSendingResendSms.value = false
  }
}
const showDuplicateWarning = ref(false)
const duplicateInfo = ref({
  title: '',
  message: '',
  existingUser: null as any,
  actionTitle: '',
  actions: [] as string[],
  duplicateStatus: '' as 'active' | 'pending' | 'completed_no_account' | 'inactive' | ''
})

// Form Data
const form = ref({
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  profession: '',
  category: '',
  assigned_staff_id: ''
})

// Form Validation
const errors = ref<Record<string, string>>({})

const isFormValid = computed(() => {
  const required = bookingPolicy.value.student_required_fields
  const hasName = form.value.first_name.trim() || form.value.last_name.trim()
  if (!hasName) return false

  if (required.includes('phone') && (!form.value.phone.trim() || form.value.phone.trim().length < 10)) return false
  if (required.includes('email') && !form.value.email.trim()) return false
  if (required.includes('birthdate') && !form.value.birthdate) return false
  if (required.includes('street') && !form.value.street.trim()) return false
  if (required.includes('zip') && !form.value.zip.trim()) return false
  if (required.includes('city') && !form.value.city.trim()) return false

  return true
})

// Methods
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const formatPhoneNumber = (phone: string) => {
  if (!phone) return ''
  
  // Entferne alle nicht-numerischen Zeichen außer +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Wenn mit 0 beginnt, ersetze durch +41
  if (cleaned.startsWith('0')) {
    cleaned = '+41' + cleaned.substring(1)
  }
  
  // Wenn mit 41 beginnt, füge + hinzu
  if (cleaned.startsWith('41') && !cleaned.startsWith('+41')) {
    cleaned = '+' + cleaned
  }
  
  // Wenn weder + noch 0 noch 41, füge +41 hinzu
  if (!cleaned.startsWith('+') && !cleaned.startsWith('0') && !cleaned.startsWith('41')) {
    cleaned = '+41' + cleaned
  }
  
  return cleaned
}

const validateForm = () => {
  errors.value = {}
  const required = bookingPolicy.value.student_required_fields

  const hasName = form.value.first_name.trim() || form.value.last_name.trim()
  if (!hasName) {
    errors.value.first_name = 'Mindestens Vor- oder Nachname erforderlich'
  }

  if (required.includes('phone')) {
    const hasPhone = form.value.phone.trim() && form.value.phone.trim().length >= 10
    if (!hasPhone) errors.value.phone = 'Gültige Telefonnummer erforderlich'
  }

  if (required.includes('email') && !form.value.email.trim()) {
    errors.value.email = 'E-Mail-Adresse erforderlich'
  } else if (form.value.email.trim() && !isValidEmail(form.value.email)) {
    errors.value.email = 'Ungültige E-Mail-Adresse'
  }

  if (required.includes('birthdate') && !form.value.birthdate) {
    errors.value.birthdate = 'Geburtsdatum erforderlich'
  }
  if (required.includes('street') && !form.value.street.trim()) {
    errors.value.street = 'Strasse erforderlich'
  }
  if (required.includes('zip') && !form.value.zip.trim()) {
    errors.value.zip = 'PLZ erforderlich'
  }
  if (required.includes('city') && !form.value.city.trim()) {
    errors.value.city = 'Ort erforderlich'
  }

  return Object.keys(errors.value).length === 0
}

const resetForm = () => {
  form.value = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: '',
    profession: '',
    category: '',
    assigned_staff_id: ''
  }
  errors.value = {}
}


const submitForm = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  logger.debug('🚀🚀🚀 Starting form submission...')

  try {
    // Prepare form data
    const studentData: any = {
      first_name: form.value.first_name.trim() || '',
      last_name: form.value.last_name.trim() || '',
      phone: form.value.phone.trim() || '',
      skip_sms: !bookingPolicy.value.onboarding_sms_enabled,
    }

    // Optional fields — send only when filled
    if (form.value.email.trim()) studentData.email = form.value.email.trim().toLowerCase()
    if (form.value.birthdate) studentData.birthdate = form.value.birthdate
    if (form.value.street) studentData.street = form.value.street.trim()
    if (form.value.street_nr) studentData.street_nr = form.value.street_nr.trim()
    if (form.value.zip) studentData.zip = form.value.zip.trim()
    if (form.value.city) studentData.city = form.value.city.trim()
    if (form.value.profession) studentData.profession = form.value.profession.trim()
    if (form.value.category) studentData.category = form.value.category

    logger.debug('📝 Calling new /api/staff/add-student API with:', studentData)
    
    // Call the new secure API endpoint
    const response = await $fetch('/api/staff/add-student', {
      method: 'POST',
      body: studentData
    }).catch((err: any) => {
      // Re-throw with proper error structure
      throw err
    })

    const newStudent = response as any
    
    logger.debug('✅✅✅ Schüler erfolgreich hinzugefügt:', newStudent)
    logger.debug('📱 SMS Success:', newStudent?.smsSuccess)
    logger.debug('📧 Email Success:', newStudent?.emailSuccess)
    logger.debug('🔗 Onboarding Link:', newStudent?.onboardingLink)
    
    const smsEnabled = bookingPolicy.value.onboarding_sms_enabled
    const hasEmail = !!form.value.email.trim()
    let inviteMsg = 'Schüler wurde erfasst.'
    if (smsEnabled && form.value.phone) inviteMsg = `Onboarding-SMS wurde an ${form.value.phone} gesendet.`
    else if (hasEmail) inviteMsg = `Schüler wurde erfasst. Bestätigungs-E-Mail folgt nach Terminerstellung.`

    uiStore.addNotification({
      type: 'success',
      title: 'Schüler erstellt!',
      message: inviteMsg,
    })
    
    logger.debug('🚀 Resetting form after notification')
    resetForm()
    emit('added', newStudent)
    
    // ✅ Dann nach weiterer Verzögerung Modal schließen (500ms später)
    await new Promise(resolve => setTimeout(resolve, 500))
    logger.debug('🚀 Closing modal')
    emit('close')

  } catch (error: any) {
    console.error('❌ Fehler beim Hinzufügen des Schülers:', error)
    
    // ofetch/$fetch wraps H3 errors as:
    //   error.message/statusMessage = 'DUPLICATE_PHONE'
    //   error.data = { existingUser: {...} }
    const errorMessage = error.message || error.statusMessage || error.data?.statusMessage || ''
    const existingUserData = error.existingUser || error.data?.existingUser || error.data?.data?.existingUser || null
    const isDuplicatePhone = errorMessage.includes('DUPLICATE_PHONE') || error.statusMessage === 'DUPLICATE_PHONE' || error.data?.statusMessage === 'DUPLICATE_PHONE'
    const isDuplicateEmail = errorMessage.includes('DUPLICATE_EMAIL') || error.statusMessage === 'DUPLICATE_EMAIL' || error.data?.statusMessage === 'DUPLICATE_EMAIL'

    // ✅ Verständliche Fehlermeldungen mit schönem Modal
    // Prüfe auch auf Datenbank-Constraint-Fehler (code: 23505)
    const isDatabaseDuplicatePhone = error.code === '23505' && 
      (errorMessage?.includes('users_phone_tenant_unique') || 
       errorMessage?.includes('phone'))
    
    const isDatabaseDuplicateEmail = error.code === '23505' && 
      (errorMessage?.includes('users_email_tenant_unique') || 
       errorMessage?.includes('email'))
    
    if (isDuplicatePhone || isDatabaseDuplicatePhone) {
      const existing = existingUserData
      const hasAccount = existing?.auth_user_id !== null
      const isActive = existing?.is_active
      const onboardingStatus = existing?.onboarding_status
      
      let title = 'Telefonnummer bereits vorhanden'
      let message = `Diese Telefonnummer ist bereits registriert.`
      let actionTitle = '⚠️ Telefonnummer bereits verwendet'
      let actions: string[] = []
      
      if (existing?.first_name && existing?.last_name) {
        message = `Diese Telefonnummer ist bereits registriert für ${existing.first_name} ${existing.last_name}.`
      }
      
      // ✅ Status-basierte Meldungen
      if (isActive && hasAccount) {
        // Aktiver Schüler mit Konto
        title = '✅ Schüler ist bereits aktiv'
        actionTitle = 'Der Schüler ist bereits registriert und hat ein Konto'
        actions = [
          'Schüler anweisen, sich mit E-Mail/Telefon anzumelden',
          'Bei Passwort vergessen: "Passwort vergessen" verwenden'
        ]
      } else if (onboardingStatus === 'pending' && !hasAccount) {
        // Pending - Onboarding noch nicht abgeschlossen
        title = '⏳ Schüler wartet auf Onboarding'
        actionTitle = 'Der Schüler hat noch sein Onboarding nicht abgeschlossen'
        actions = [
          'Schüler:in kann den Link in der Onboarding-SMS/E-Mail noch verwenden',
          'Falls dieser nicht mehr gültig ist, kannst du ein neues SMS/E-Mail senden."',
        ]
      } else if (onboardingStatus === 'completed' && !hasAccount) {
        // Completed aber kein Account - ungewöhnlich
        title = '⚠️ Onboarding abgeschlossen, aber kein Konto'
        actionTitle = 'Der Schüler hat Onboarding gemacht, aber hat kein aktives Konto'
        actions = [
          'Kontakt mit dem Schüler aufnehmen',
          'Konto manuell aktivieren oder neu erstellen',
          'Technischer Support kontaktieren'
        ]
      } else if (!isActive && !hasAccount) {
        // Inaktiver Schüler ohne Konto
        title = '❌ Schüler ist inaktiv'
        actionTitle = 'Der Schüler ist inaktiv oder wurde gelöscht'
        actions = [
          'Bestehende Telefonnummer in der Schülerliste suchen',
          'Ggf. inaktiven/alten Schüler aktivieren oder löschen',
          'Andere Telefonnummer verwenden'
        ]
      }
      
      duplicateInfo.value = {
        title: title,
        message: message,
        existingUser: existing || null,
        actionTitle: actionTitle,
        actions: actions,
        duplicateStatus: isActive && hasAccount ? 'active'
          : onboardingStatus === 'pending' && !hasAccount ? 'pending'
          : onboardingStatus === 'completed' && !hasAccount ? 'completed_no_account'
          : !isActive && !hasAccount ? 'inactive' : ''
      }
      
      errors.value.phone = 'Diese Telefonnummer ist bereits registriert'
      showDuplicateWarning.value = true
      
      // ✅ AUCH Toast anzeigen
      uiStore.addNotification({
        type: 'error',
        title: title,
        message: message
      })
      
    } else if (isDuplicateEmail || isDatabaseDuplicateEmail) {
      const existing = existingUserData
      const hasAccount = existing?.auth_user_id !== null
      const isActive = existing?.is_active
      const onboardingStatus = existing?.onboarding_status
      
      let title = 'E-Mail bereits vorhanden'
      let message = `Diese E-Mail-Adresse ist bereits registriert.`
      let actionTitle = '⚠️ E-Mail bereits verwendet'
      let actions: string[] = []
      
      if (existing?.first_name && existing?.last_name) {
        message = `Diese E-Mail-Adresse ist bereits registriert für ${existing.first_name} ${existing.last_name}.`
      }
      
      // ✅ Status-basierte Meldungen
      if (isActive && hasAccount) {
        // Aktiver Schüler mit Konto
        title = '✅ Schüler ist bereits aktiv'
        actionTitle = 'Der Schüler ist bereits registriert und hat ein Konto'
        actions = [
          'Schüler anweisen, sich mit E-Mail anzumelden',
          'Bei Passwort vergessen: "Passwort vergessen" verwenden'
        ]
      } else if (onboardingStatus === 'pending' && !hasAccount) {
        // Pending - Onboarding noch nicht abgeschlossen
        title = '⏳ Schüler wartet auf Onboarding'
        actionTitle = 'Der Schüler hat noch sein Onboarding nicht abgeschlossen'
        actions = [
          'Schüler kann noch die Onboarding-SMS/E-Mail verwenden',
          'Erneut SMS/E-Mail senden (falls nicht erhalten)',
          'Konto manuell löschen und neu erstellen falls nötig'
        ]
      } else if (onboardingStatus === 'completed' && !hasAccount) {
        // Completed aber kein Account - ungewöhnlich
        title = '⚠️ Onboarding abgeschlossen, aber kein Konto'
        actionTitle = 'Der Schüler hat Onboarding gemacht, aber hat kein aktives Konto'
        actions = [
          'Kontakt mit dem Schüler aufnehmen',
          'Konto manuell aktivieren oder neu erstellen',
          'Technischer Support kontaktieren'
        ]
      } else if (!isActive && !hasAccount) {
        // Inaktiver Schüler ohne Konto
        title = '❌ Schüler ist inaktiv'
        actionTitle = 'Der Schüler ist inaktiv oder wurde gelöscht'
        actions = [
          'Bestehende E-Mail in der Schülerliste suchen',
          'Ggf. inaktiven/alten Schüler aktivieren oder löschen',
          'Andere E-Mail verwenden'
        ]
      }
      
      duplicateInfo.value = {
        title: title,
        message: message,
        existingUser: existing || null,
        actionTitle: actionTitle,
        actions: actions,
        duplicateStatus: isActive && hasAccount ? 'active'
          : onboardingStatus === 'pending' && !hasAccount ? 'pending'
          : onboardingStatus === 'completed' && !hasAccount ? 'completed_no_account'
          : !isActive && !hasAccount ? 'inactive' : ''
      }
      
      errors.value.email = 'Diese E-Mail-Adresse ist bereits registriert'
      showDuplicateWarning.value = true
      
      // ✅ AUCH Toast anzeigen
      uiStore.addNotification({
        type: 'error',
        title: title,
        message: message
      })
      
    } else if (errorMessage?.toLowerCase().includes('duplicate')) {
      errors.value.email = 'Diese E-Mail-Adresse oder Telefonnummer ist bereits registriert'
      uiStore.addNotification({
        type: 'error',
        title: 'Duplikat gefunden',
        message: 'Ein Schüler mit dieser E-Mail oder Telefonnummer existiert bereits.'
      })
    } else {
      // General error
      uiStore.addNotification({
        type: 'error',
        title: 'Fehler',
        message: 'Fehler beim Hinzufügen des Schülers: ' + errorMessage
      })
    }
  } finally {
    isSubmitting.value = false
  }
}

// Watchers
watch(() => props.show, (newValue) => {
  if (newValue) {
    resetForm()
  }
})

// Real-time validation
watch(() => form.value.first_name, () => {
  if (errors.value.first_name && form.value.first_name.trim()) {
    delete errors.value.first_name
  }
})

watch(() => form.value.last_name, () => {
  if (errors.value.last_name && form.value.last_name.trim()) {
    delete errors.value.last_name
  }
})

watch(() => form.value.phone, () => {
  if (errors.value.phone && form.value.phone.trim()) {
    delete errors.value.phone
  }
})

watch(() => form.value.category, () => {
  if (errors.value.category && form.value.category.trim()) {
    delete errors.value.category
  }
})

watch(() => form.value.street, () => {
  if (errors.value.street && form.value.street.trim()) {
    delete errors.value.street
  }
})

watch(() => form.value.street_nr, () => {
  if (errors.value.street_nr && form.value.street_nr.trim()) {
    delete errors.value.street_nr
  }
})

watch(() => form.value.zip, () => {
  if (errors.value.zip && form.value.zip.trim()) {
    delete errors.value.zip
  }
})

watch(() => form.value.city, () => {
  if (errors.value.city && form.value.city.trim()) {
    delete errors.value.city
  }
})

// Phone number formatting watcher
watch(() => form.value.phone, (newPhone) => {
  if (newPhone) {
    const formatted = formatPhoneNumber(newPhone)
    if (formatted !== newPhone) {
      form.value.phone = formatted
    }
  }
})
</script>

<style scoped>
@keyframes btn-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes dot-bounce {
  0%, 60%, 100% { opacity: 0; transform: translateY(0); }
  30%            { opacity: 1; transform: translateY(-3px); }
}

/* Icon transition: scale + rotate */
.btn-icon-enter-active,
.btn-icon-leave-active { transition: all 0.18s ease; }
.btn-icon-enter-from   { opacity: 0; transform: scale(0.4) rotate(-90deg); }
.btn-icon-leave-to     { opacity: 0; transform: scale(0.4) rotate(90deg); }

/* Text transition: fade + slide up */
.btn-text-enter-active,
.btn-text-leave-active { transition: all 0.15s ease; }
.btn-text-enter-from   { opacity: 0; transform: translateY(6px); }
.btn-text-leave-to     { opacity: 0; transform: translateY(-6px); }
</style>