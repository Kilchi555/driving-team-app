<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h1 class="text-center text-3xl font-bold text-gray-900">
        Willkommen bei {{ tenantName }}
      </h1>
      <p class="mt-2 text-center text-sm text-gray-600">
        Vervollständige deine Registrierung
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Lade Daten...</p>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-red-50 py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div class="text-center">
          <p class="text-red-600">{{ error }}</p>
          <button
            @click="navigateTo('/')"
            class="mt-4 text-green-600 hover:text-green-700 font-medium"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    </div>

    <!-- Main Form -->
    <div v-else class="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between max-w-2xl mx-auto">
            <div 
              v-for="(stepItem, index) in steps" 
              :key="index"
              class="flex-1 flex flex-col items-center"
            >
              <div class="flex items-center w-full">
                <div 
                  class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-300"
                  :class="{
                    'bg-green-600 border-green-600 text-white shadow-lg': index < step,
                    'bg-green-600 border-green-600 text-white shadow-lg ring-4 ring-green-100': index === step,
                    'bg-white border-gray-300 text-gray-400': index > step
                  }"
                >
                  <svg v-if="index < step" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  <span v-else class="text-sm font-semibold">{{ index + 1 }}</span>
                </div>
                <div 
                  v-if="index < steps.length - 1"
                  class="flex-1 h-0.5 mx-3 transition-colors duration-300"
                  :class="{
                    'bg-green-600': index < step,
                    'bg-gray-300': index >= step
                  }"
                ></div>
              </div>
              <p class="mt-3 text-xs text-center font-medium" :class="{
                'text-green-600': index <= step,
                'text-gray-500': index > step
              }">{{ stepItem }}</p>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleNextStep">
          <!-- Step 1: Set Password -->
          <div v-if="step === 0">
            <h2 class="text-xl font-bold mb-4">Setze dein Passwort</h2>
            <p class="text-sm text-gray-600 mb-6">
              Wähle ein sicheres Passwort für deinen Login.
            </p>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Passwort *
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  data-form-type="other"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Mindestens 8 Zeichen"
                >
                <div class="mt-1 text-xs">
                  <p :class="passwordTooShort ? 'text-red-600' : 'text-gray-500'">
                    {{ passwordTooShort ? 'Passwort ist zu kurz (min. 8 Zeichen).' : 'Mindestens 8 Zeichen, empfohlen: Gross-/Kleinbuchstaben, Zahlen & Sonderzeichen' }}
                  </p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen *
                </label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  autocomplete="new-password"
                  data-form-type="other"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Passwort wiederholen"
                >
                <p v-if="passwordMismatch" class="mt-1 text-xs text-red-600">Passwörter stimmen nicht überein.</p>
              </div>

              <p v-if="passwordError" class="text-red-600 text-sm">{{ passwordError }}</p>
            </div>
          </div>

          <!-- Step 2: Complete Profile -->
          <div v-if="step === 1">
            <h2 class="text-xl font-bold mb-4">Vervollständige dein Profil</h2>
            <p class="text-sm text-gray-600 mb-6">
              Diese Daten benötigen wir für deine Fahrstunden.
            </p>

            <div class="space-y-4">
              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail Adresse *
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="max.mustermann@example.com"
                >
              </div>

              <!-- Birthdate -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Geburtsdatum *
                </label>
                <input
                  v-model="form.birthdate"
                  type="date"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Führerausweis-Kategorie *
                </label>
                <select
                  v-model="form.category"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Kategorie wählen</option>
                  <option v-for="cat in categories" :key="cat.code || cat.id" :value="cat.code || cat.id">
                    {{ cat.name || cat.code || cat.id }}
                  </option>
                </select>
              </div>

              <!-- Address -->
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Strasse *
                  </label>
                  <input
                    v-model="form.street"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Musterstrasse"
                  >
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nr. *
                  </label>
                  <input
                    v-model="form.street_nr"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123"
                  >
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    PLZ *
                  </label>
                  <input
                    v-model="form.zip"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="8000"
                  >
                </div>

                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Ort *
                  </label>
                  <input
                    v-model="form.city"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Zürich"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Upload Documents -->
          <div v-if="step === 2">
            <h2 class="text-xl font-bold mb-4">Dokumente hochladen</h2>
            <p class="text-sm text-gray-600 mb-6">
              Bitte lade deinen Lernfahr- oder Fahrausweis hoch.
            </p>

            <div class="space-y-6">
              <!-- Lernfahr- oder Fahrausweis (Required) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Lernfahr- oder Fahrausweis *
                </label>
                
                <!-- File Upload Area -->
                <div 
                  @drop="handleDrop($event, 'learner_permit')"
                  @dragover="handleDragOver($event, 'learner_permit')"
                  @dragenter="handleDragOver($event, 'learner_permit')"
                  @dragleave="handleDragLeave($event, 'learner_permit')"
                  :class="[
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200',
                    dragOver.learner_permit ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'
                  ]"
                >
                  <div v-if="!uploadedFiles.learner_permit">
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-4">
                      <label for="learner_permit" class="cursor-pointer">
                        <span class="mt-2 block text-sm font-medium text-gray-900">
                          Datei hierher ziehen oder
                          <span class="text-green-600 hover:text-green-500">durchsuchen</span>
                        </span>
                        <p class="mt-1 text-xs text-gray-500">
                          PNG, JPG, PDF bis 10MB
                        </p>
                      </label>
                      <input
                        id="learner_permit"
                        type="file"
                        accept="image/*,.pdf"
                        @change="handleFileUpload($event, 'learner_permit')"
                        class="sr-only"
                        required
                      >
                    </div>
                  </div>
                  
                  <!-- File Preview -->
                  <div v-else class="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div class="flex items-center space-x-3">
                      <div class="flex-shrink-0">
                        <svg v-if="uploadedFiles.learner_permit.type.startsWith('image/')" class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <svg v-else class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-green-900 truncate">
                          {{ uploadedFiles.learner_permit.name }}
                        </p>
                        <p class="text-xs text-green-600">
                          {{ formatFileSize(uploadedFiles.learner_permit.size) }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="removeFile('learner_permit')"
                      class="flex-shrink-0 p-1 text-green-600 hover:text-green-800"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Terms & Conditions -->
          <div v-if="step === 3">
            <h2 class="text-xl font-bold mb-4">AGB akzeptieren</h2>
            <p class="text-sm text-gray-600 mb-6">
              Bitte lies und akzeptiere unsere Allgemeinen Geschäftsbedingungen.
            </p>

            <div class="space-y-4">
              <div class="border rounded-md p-4 max-h-60 sm:max-h-80 overflow-y-auto bg-gray-50">
                <h3 class="font-semibold mb-2 text-gray-900">Allgemeine Geschäftsbedingungen</h3>
                <div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {{ termsText }}
                </div>
              </div>

              <div class="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <input
                  v-model="form.acceptedTerms"
                  type="checkbox"
                  required
                  class="mt-1 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded flex-shrink-0"
                >
                <label class="text-sm text-gray-700 leading-relaxed">
                  Ich akzeptiere die Allgemeinen Geschäftsbedingungen und bestätige, dass ich alle Angaben korrekt gemacht habe. *
                </label>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <button
              v-if="step > 0"
              type="button"
              @click="step--"
              class="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              ← Zurück
            </button>
            <div v-else class="hidden sm:block"></div>

            <button
              type="submit"
              :disabled="isSubmitting || (step === 0 && (passwordTooShort || passwordMismatch))"
              class="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <span v-if="isSubmitting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird verarbeitet...
              </span>
              <span v-else>
                {{ step === 3 ? 'Registrierung abschliessen' : 'Weiter →' }}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- Error Modal -->
    <div v-if="showErrorModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-gray-900">Registrierung fehlgeschlagen</h3>
          </div>
        </div>
        <div class="mb-6">
          <p class="text-sm text-gray-600">{{ error }}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="showErrorModal = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Nochmal versuchen
          </button>
          <button
            @click="goToLogin"
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Zum Login
          </button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-gray-900">Registrierung erfolgreich!</h3>
          </div>
        </div>
        <div class="mb-6">
          <p class="text-sm text-gray-600">{{ successMessage }}</p>
        </div>
        <div class="flex justify-end">
          <button
            @click="goToLogin"
            class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Zum Login
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const token = route.params.token as string

const step = ref(0)
const steps = ['Passwort', 'Profil', 'Dokumente', 'AGB']

const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const passwordError = ref('')
const successMessage = ref('')
const showErrorModal = ref(false)
const showSuccessModal = ref(false)
const passwordTooShort = computed(() => form.password.length > 0 && form.password.length < 8)
const passwordMismatch = computed(() => form.confirmPassword.length > 0 && form.password !== form.confirmPassword)

const tenantName = ref('Deiner Fahrschule')
const userData = ref<any>(null)
const categories = ref<any[]>([])
const termsText = ref('AGB werden geladen...')

const form = reactive({
  password: '',
  confirmPassword: '',
  email: '',
  birthdate: '',
  category: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  acceptedTerms: false
})

const uploadedFiles = reactive<Record<string, File>>({})
const dragOver = reactive<Record<string, boolean>>({})

// Load user data by token
onMounted(async () => {
  try {
    const { data, error: fetchError } = await useFetch('/api/students/verify-onboarding-token', {
      method: 'POST',
      body: { token }
    })

    if (fetchError.value || !data.value?.success) {
      error.value = 'Ungültiger oder abgelaufener Link. Bitte kontaktiere deine Fahrschule.'
      return
    }

    userData.value = data.value.user
    tenantName.value = data.value.tenantName || 'Deiner Fahrschule'
    
    // Pre-fill known data
    if (userData.value.email) form.email = userData.value.email

    // Load dynamic categories
    try {
      const { data: catData } = await useFetch(`/api/onboarding/categories`, {
        method: 'GET',
        query: { token }
      })
      categories.value = catData.value?.categories || []
    } catch {}

    // Load dynamic terms/policies
    try {
      const { data: termsData } = await useFetch(`/api/onboarding/terms`, {
        method: 'GET',
        query: { token }
      })
      termsText.value = (termsData.value?.terms || 'AGB aktuell nicht verfügbar').trim()
    } catch {
      termsText.value = 'AGB aktuell nicht verfügbar'
    }
    
  } catch (err: any) {
    error.value = 'Fehler beim Laden der Daten. Bitte versuche es später erneut.'
  } finally {
    isLoading.value = false
  }
})

// Handle file uploads
const handleFileUpload = (event: Event, type: string) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadedFiles[type] = file
  }
}

// Handle drag and drop
const handleDrop = (event: DragEvent, type: string) => {
  event.preventDefault()
  dragOver[type] = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      uploadedFiles[type] = file
    }
  }
}

// Handle drag over
const handleDragOver = (event: DragEvent, type: string) => {
  event.preventDefault()
  dragOver[type] = true
}

// Handle drag leave
const handleDragLeave = (event: DragEvent, type: string) => {
  event.preventDefault()
  dragOver[type] = false
}

// Remove file
const removeFile = (type: string) => {
  delete uploadedFiles[type]
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Show error message
const showErrorMessage = (message: string) => {
  error.value = message
  showErrorModal.value = true
}

// Show success message
const showSuccessMessage = (message: string) => {
  successMessage.value = message
  showSuccessModal.value = true
}

// Navigate to login
const goToLogin = async () => {
  await navigateTo('/login')
}

// Handle next step
const handleNextStep = async () => {
  // Validate current step
  if (step.value === 0) {
    // Password validation
    if (form.password.length < 8) {
      passwordError.value = 'Passwort muss mindestens 8 Zeichen lang sein'
      return
    }
    if (form.password !== form.confirmPassword) {
      passwordError.value = 'Passwörter stimmen nicht überein'
      return
    }
    passwordError.value = ''
    step.value++
  } else if (step.value < 3) {
    step.value++
  } else {
    // Final step - submit
    await completeOnboarding()
  }
}

// Complete onboarding
const completeOnboarding = async () => {
  isSubmitting.value = true

  try {
    // Upload documents first
    const documentUrls: Record<string, string> = {}
    
    for (const [type, file] of Object.entries(uploadedFiles)) {
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)
        formData.append('userId', userData.value.id)

        const { data: uploadData } = await useFetch('/api/students/upload-document', {
          method: 'POST',
          body: formData
        })

        if (uploadData.value?.url) {
          documentUrls[type] = uploadData.value.url
        }
      }
    }

    // Complete onboarding
    const requestBody = {
      token,
      password: form.password,
      email: form.email,
      birthdate: form.birthdate,
      category: form.category,
      street: form.street,
      street_nr: form.street_nr,
      zip: form.zip,
      city: form.city,
      documentUrls
    }
    
    console.log('📤 Sending onboarding completion request:', requestBody)
    
    const { data, error: completeError } = await useFetch('/api/students/complete-onboarding', {
      method: 'POST',
      body: requestBody
    })
    
    console.log('📥 Onboarding completion response:', { data: data.value, error: completeError.value })

    if (completeError.value) {
      console.error('❌ Complete error details:', completeError.value)
      const errorMessage = completeError.value.data?.message || completeError.value.message || 'Unbekannter Fehler'
      throw new Error(`Registrierung fehlgeschlagen: ${errorMessage}`)
    }

    if (!data.value?.success) {
      throw new Error('Registrierung fehlgeschlagen: Server hat keinen Erfolg zurückgegeben')
    }

    // Success - show success message and redirect
    showSuccessMessage('Registrierung erfolgreich abgeschlossen! Du wirst zum Login weitergeleitet...')
    setTimeout(async () => {
      await navigateTo('/login')
    }, 2000)

  } catch (err: any) {
    console.error('❌ Onboarding completion error:', err)
    showErrorMessage(err.message || 'Fehler beim Abschliessen der Registrierung')
  } finally {
    isSubmitting.value = false
  }
}
</script>

