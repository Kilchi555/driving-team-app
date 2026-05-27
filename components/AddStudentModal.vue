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
            Mindestens Vor- oder Nachname + Telefonnummer erforderlich
          </div>

          <!-- Vorname / Nachname -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="firstName" class="block text-xs font-medium text-gray-500 mb-1">Vorname</label>
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
              <label for="lastName" class="block text-xs font-medium text-gray-500 mb-1">Nachname</label>
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
          <div>
            <label for="phone" class="block text-xs font-medium text-gray-500 mb-1">Telefonnummer *</label>
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
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            :style="isFormValid && !isSubmitting ? primaryBg : {}"
            :class="isFormValid && !isSubmitting ? '' : 'bg-gray-200 text-gray-400'"
          >
            <svg v-if="isSubmitting" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isSubmitting ? 'Speichert...' : 'Einladen & Speichern' }}
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
  // Mindestens ein Name (Vor- ODER Nachname)
  const hasName = form.value.first_name.trim() || form.value.last_name.trim()
  
  // Telefon ist erforderlich (nur SMS now)
  const hasPhone = form.value.phone.trim() && form.value.phone.trim().length >= 12
  
  return hasName && hasPhone
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

  // Mindestens ein Name erforderlich
  const hasName = form.value.first_name.trim() || form.value.last_name.trim()
  if (!hasName) {
    errors.value.first_name = 'Mindestens Vor- oder Nachname erforderlich'
  }

  // Telefon ist erforderlich (nur SMS)
  const hasPhone = form.value.phone.trim() && form.value.phone.trim().length >= 12
  if (!hasPhone) {
    errors.value.phone = 'Gültige Telefonnummer erforderlich'
  }

  return Object.keys(errors.value).length === 0
}

const resetForm = () => {
  form.value = {
    first_name: '',
    last_name: '',
    phone: '',
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
    // Prepare form data - ensure at least empty strings for required DB fields
    const studentData: any = {
      first_name: form.value.first_name.trim() || '',
      last_name: form.value.last_name.trim() || '',
      phone: form.value.phone.trim() || ''
    }
    
    // Add optional fields only if they have values
    if (form.value.birthdate) studentData.birthdate = form.value.birthdate
    if (form.value.street) studentData.street = form.value.street.trim()
    if (form.value.street_nr) studentData.street_nr = form.value.street_nr.trim()
    if (form.value.zip) studentData.zip = form.value.zip.trim()
    if (form.value.city) studentData.city = form.value.city.trim()
    if (form.value.profession) studentData.profession = form.value.profession.trim()
    if (form.value.category) studentData.category = form.value.category
    // ✅ NOTE: assigned_staff_id is now automatically set by the API based on authenticated user
    // No need to pass it from frontend anymore

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
    
    // ✅ Benachrichtigung via globales UI Toast (bessere UX, länger sichtbar)
    const contactInfo = form.value.phone
    const contactType = 'SMS'
    
    logger.debug('✅ Schüler erstellt und Einladung versendet via:', contactType)
    
    // Use global UI toast for better UX and longer visibility
    uiStore.addNotification({
      type: 'success',
      title: 'Schüler erstellt!',
      message: `Onboarding-Link wurde via ${contactType} an ${contactInfo} gesendet.`
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