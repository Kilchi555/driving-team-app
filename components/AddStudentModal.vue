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
  <div v-if="showDuplicateWarning" class="fixed inset-0 z-[60] flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="showDuplicateWarning = false"></div>
    
    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b bg-orange-50">
        <div class="flex items-center gap-3">
          <div class="text-3xl">⚠️</div>
          <h2 class="text-xl font-bold text-gray-900">{{ duplicateInfo.title }}</h2>
        </div>
        <button 
          @click="showDuplicateWarning = false"
          class="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <p class="text-gray-700">{{ duplicateInfo.message }}</p>
        
        <!-- Existing User Info (nur wenn Daten vorhanden) -->
        <div v-if="duplicateInfo.existingUser && duplicateInfo.existingUser.first_name" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm font-medium text-gray-900 mb-2">Bestehender Schüler:</p>
          <div class="space-y-1 text-sm text-gray-600">
            <p><strong>Name:</strong> {{ duplicateInfo.existingUser.first_name }} {{ duplicateInfo.existingUser.last_name }}</p>
            <p v-if="duplicateInfo.existingUser.email"><strong>E-Mail:</strong> {{ duplicateInfo.existingUser.email }}</p>
            <p v-if="duplicateInfo.existingUser.phone"><strong>Telefon:</strong> {{ duplicateInfo.existingUser.phone }}</p>
          </div>
        </div>

        <!-- Action Instructions -->
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p class="text-sm font-medium text-blue-900 mb-2">{{ duplicateInfo.actionTitle }}</p>
          <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li v-for="(action, index) in duplicateInfo.actions" :key="index">{{ action }}</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end p-6 border-t bg-gray-50 gap-3">
        <button
          @click="showDuplicateWarning = false"
          class="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Verstanden
        </button>
      </div>
    </div>
  </div>

  <!-- Add Student Modal -->
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>
    
    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b bg-gray-50">
        <h2 class="text-xl font-bold text-gray-900">Neuen Schüler hinzufügen</h2>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitForm" class="overflow-y-auto max-h-[70vh]">
        <div class="p-6 space-y-6">
          <!-- Personal Information -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Persönliche Angaben</h3>
            <!-- Info Banner -->
            <div class="mb-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
              ℹ️ Mindestens Vor- oder Nachname + Telefon oder E-Mail erforderlich
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- First Name -->
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                  Vorname
                </label>
                <input
                  id="firstName"
                  v-model="form.first_name"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.first_name }"
                >
                <p v-if="errors.first_name" class="text-red-600 text-xs mt-1">{{ errors.first_name }}</p>
              </div>

              <!-- Last Name -->
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                  Nachname
                </label>
                <input
                  id="lastName"
                  v-model="form.last_name"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.last_name }"
                >
                <p v-if="errors.last_name" class="text-red-600 text-xs mt-1">{{ errors.last_name }}</p>
              </div>


              <!-- Phone -->
              <div class="md:col-span-2">
                <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer <span class="text-gray-400 text-xs">(oder E-Mail)</span>
                </label>
                <input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.phone }"
                  placeholder="+41 79 123 45 67"
                >
                <p v-if="errors.phone" class="text-red-600 text-xs mt-1">{{ errors.phone }}</p>
              </div>

              <!-- Email -->
              <div class="md:col-span-2">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail Adresse <span class="text-gray-400 text-xs">(oder Telefonnummer)</span>
                </label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.email }"
                  placeholder="max.mustermann@example.com"
                >
                <p v-if="errors.email" class="text-red-600 text-xs mt-1">{{ errors.email }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer - Sticky -->
        <div class="sticky bottom-0 flex items-center justify-between p-6 border-t bg-white shadow-lg">
          <div class="flex gap-4">
            <button
              type="button"
              @click="$emit('close')"
              class="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              :class="[
                'px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2',
                isFormValid && !isSubmitting
                  ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300 shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
            >
              <span v-if="isSubmitting" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Speichert...
              </span>
              <span v-else>
                Speichern
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { useStudents } from '~/composables/useStudents'
import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'
import Toast from '~/components/Toast.vue'

const uiStore = useUIStore()

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

// Composables
const { addStudent } = useStudents()

// State
const isSubmitting = ref(false)
const staffMembers = ref<any[]>([])
const availableCategories = ref<any[]>([])
const isLoadingCategories = ref(false)
const showDuplicateWarning = ref(false)
const duplicateInfo = ref({
  title: '',
  message: '',
  existingUser: null as any,
  actionTitle: '',
  actions: [] as string[]
})

// Form Data
const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  category: '',
  assigned_staff_id: ''
})

// Form Validation
const errors = ref<Record<string, string>>({})

const isFormValid = computed(() => {
  // Mindestens ein Name (Vor- ODER Nachname)
  const hasName = form.value.first_name.trim() || form.value.last_name.trim()
  
  // Mindestens Telefon ODER Email
  const hasPhone = form.value.phone.trim() && form.value.phone.trim().length >= 12
  const hasEmail = form.value.email && isValidEmail(form.value.email)
  
  return hasName && (hasPhone || hasEmail)
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

  // Mindestens Telefon ODER Email erforderlich
  const hasPhone = form.value.phone.trim() && form.value.phone.trim().length >= 12
  const hasEmail = form.value.email && isValidEmail(form.value.email)
  
  if (!hasPhone && !hasEmail) {
    errors.value.phone = 'Telefonnummer oder E-Mail erforderlich'
    errors.value.email = 'Telefonnummer oder E-Mail erforderlich'
  }

  // E-Mail-Validierung (nur wenn angegeben)
  if (form.value.email && !isValidEmail(form.value.email)) {
    errors.value.email = 'Ungültige E-Mail-Adresse'
  }

  return Object.keys(errors.value).length === 0
}

const resetForm = () => {
  form.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: '',
    category: '',
    assigned_staff_id: ''
  }
  errors.value = {}
}

const loadStaffMembers = async () => {
  if (props.currentUser?.role !== 'admin') return

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('first_name')

    if (error) throw error
    staffMembers.value = data || []

  } catch (error) {
    console.error('Fehler beim Laden der Fahrlehrer:', error)
  }
}

const loadCategories = async () => {
  if (!props.currentUser?.id) return

  isLoadingCategories.value = true
  try {
    const supabase = getSupabase()
    
    // Get user's tenant_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', props.currentUser.id)
      .single()

    if (userError || !userProfile?.tenant_id) {
      console.error('Could not get tenant_id:', userError)
      return
    }

    // Load categories for this tenant
    const { data, error } = await supabase
      .from('categories')
      .select('code, name, is_active')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .order('code')

    if (error) throw error
    availableCategories.value = data || []

  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error)
    // Fallback categories
    availableCategories.value = [
      { code: 'B', name: 'B - Auto' },
      { code: 'A1', name: 'A1 - Motorrad 125cc' },
      { code: 'A', name: 'A - Motorrad' },
      { code: 'BE', name: 'BE - Anhänger' },
      { code: 'C', name: 'C - LKW' },
      { code: 'C1', name: 'C1 - LKW klein' },
      { code: 'CE', name: 'CE - LKW mit Anhänger' }
    ]
  } finally {
    isLoadingCategories.value = false
  }
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
      email: form.value.email.trim() || '',
      phone: form.value.phone.trim() || ''
    }
    
    // Add optional fields only if they have values
    if (form.value.birthdate) studentData.birthdate = form.value.birthdate
    if (form.value.street) studentData.street = form.value.street.trim()
    if (form.value.street_nr) studentData.street_nr = form.value.street_nr.trim()
    if (form.value.zip) studentData.zip = form.value.zip.trim()
    if (form.value.city) studentData.city = form.value.city.trim()
    if (form.value.category) studentData.category = form.value.category
    if (form.value.assigned_staff_id) studentData.assigned_staff_id = form.value.assigned_staff_id

    // Auto-assign to current user if staff
    if (props.currentUser?.role === 'staff') {
      studentData.assigned_staff_id = props.currentUser.id
    }

    logger.debug('📝 Calling addStudent with:', studentData)
    const newStudent = await addStudent(studentData) as any
    
    logger.debug('✅✅✅ Schüler erfolgreich hinzugefügt:', newStudent)
    logger.debug('📱 SMS Success:', newStudent?.smsSuccess)
    logger.debug('📧 Email Success:', newStudent?.emailSuccess)
    logger.debug('🔗 Onboarding Link:', newStudent?.onboardingLink)
    
    // ✅ Benachrichtigung basierend auf Versandmethode
    if (newStudent?.smsSuccess) {
      logger.debug('📲📲📲 SMS success notification triggered')
      showSuccessToast(
        'Einladung versendet!',
        `Eine SMS mit Onboarding-Link wurde an ${form.value.phone} gesendet.`
      )
    } else if (newStudent?.emailSuccess) {
      logger.debug('📧📧📧 Email success notification triggered')
      showSuccessToast(
        'Einladung versendet!',
        `Eine E-Mail mit Onboarding-Link wurde an ${form.value.email} gesendet.`
      )
    } else {
      // SMS/Email fehlgeschlagen - zeige Link zum manuellen Kopieren
      const contactInfo = form.value.phone || form.value.email
      const contactType = form.value.phone ? 'SMS' : 'E-Mail'
      
      logger.debug('⚠️⚠️⚠️ Contact method failed:', { contactType, contactInfo, smsSuccess: newStudent?.smsSuccess, emailSuccess: newStudent?.emailSuccess })
      showWarningToast(
        `Schüler erstellt, aber ${contactType} fehlgeschlagen`,
        `Bitte senden Sie den Onboarding-Link manuell an ${contactInfo}`
      )
      
      // Zeige den Link in der Konsole für Copy/Paste
      logger.debug('🔗 Onboarding-Link:', newStudent?.onboardingLink)
      
      // Optional: Kopiere Link in Zwischenablage
      if (newStudent?.onboardingLink && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(newStudent.onboardingLink)
          logger.debug('✅ Link wurde in Zwischenablage kopiert')
        } catch (e) {
          logger.debug('⚠️ Konnte Link nicht in Zwischenablage kopieren')
        }
      }
    }
    
    // Reset form and close modal - mit VIEL längerer Verzögerung damit Toast sichtbar wird
    resetForm()
    emit('added', newStudent)
    
    // Gebe der Toast-Notification Zeit, angezeigt zu werden (2 Sekunden mindestens)
    setTimeout(() => {
      logger.debug('🚀 Closing modal after toast display (2000ms delay)')
      emit('close')
    }, 2000)

  } catch (error: any) {
    console.error('❌❌❌ Fehler beim Hinzufügen des Schülers:', error)
    console.error('Error details:', error)
    
    // ✅ Verständliche Fehlermeldungen mit schönem Modal
    // Prüfe auch auf Datenbank-Constraint-Fehler (code: 23505)
    const isDatabaseDuplicatePhone = error.code === '23505' && 
      (error.message?.includes('users_phone_tenant_unique') || 
       error.message?.includes('phone'))
    
    const isDatabaseDuplicateEmail = error.code === '23505' && 
      (error.message?.includes('users_email_tenant_unique') || 
       error.message?.includes('email'))
    
    if (error.message === 'DUPLICATE_PHONE' || isDatabaseDuplicatePhone) {
      const existing = error.existingUser
      const hasAccount = existing?.auth_user_id !== null
      
      let message = `Diese Telefonnummer ist bereits registriert.`
      
      if (existing?.first_name && existing?.last_name) {
        message = `Diese Telefonnummer ist bereits registriert für ${existing.first_name} ${existing.last_name}.`
      }
      
      duplicateInfo.value = {
        title: 'Telefonnummer bereits vorhanden',
        message: message,
        existingUser: existing || null,
        actionTitle: existing 
          ? (hasAccount ? '✅ Dieser Schüler hat bereits ein Konto' : '⚠️ Konto noch nicht aktiviert')
          : '⚠️ Telefonnummer bereits verwendet',
        actions: existing && hasAccount 
          ? [
              'Schüler anweisen, sich mit E-Mail/Telefon anzumelden',
              'Bei Passwort vergessen: "Passwort vergessen" verwenden'
            ]
          : [
              'Bestehende Telefonnummer in der Schülerliste suchen',
              'Ggf. inaktiven/alten Schüler löschen',
              'Andere Telefonnummer verwenden'
            ]
      }
      
      errors.value.phone = 'Diese Telefonnummer ist bereits registriert'
      showDuplicateWarning.value = true
      
    } else if (error.message === 'DUPLICATE_EMAIL' || isDatabaseDuplicateEmail) {
      const existing = error.existingUser
      const hasAccount = existing?.auth_user_id !== null
      
      let message = `Diese E-Mail-Adresse ist bereits registriert.`
      
      if (existing?.first_name && existing?.last_name) {
        message = `Diese E-Mail-Adresse ist bereits registriert für ${existing.first_name} ${existing.last_name}.`
      }
      
      duplicateInfo.value = {
        title: 'E-Mail bereits vorhanden',
        message: message,
        existingUser: existing || null,
        actionTitle: existing 
          ? (hasAccount ? '✅ Dieser Schüler hat bereits ein Konto' : '⚠️ Konto noch nicht aktiviert')
          : '⚠️ E-Mail bereits verwendet',
        actions: existing && hasAccount 
          ? [
              'Schüler anweisen, sich mit E-Mail anzumelden',
              'Bei Passwort vergessen: "Passwort vergessen" verwenden'
            ]
          : [
              'Bestehende E-Mail in der Schülerliste suchen',
              'Ggf. inaktiven/alten Schüler löschen',
              'Andere E-Mail verwenden'
            ]
      }
      
      errors.value.email = 'Diese E-Mail-Adresse ist bereits registriert'
      showDuplicateWarning.value = true
      
    } else if (error.message?.includes('duplicate')) {
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
        message: 'Fehler beim Hinzufügen des Schülers: ' + error.message
      })
    }
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadStaffMembers()
  loadCategories()
})

// Watchers
watch(() => props.show, (newValue) => {
  if (newValue) {
    resetForm()
    loadStaffMembers()
    loadCategories()
  }
})

// Real-time validation
watch(() => form.value.email, () => {
  if (errors.value.email && isValidEmail(form.value.email)) {
    delete errors.value.email
  }
})

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