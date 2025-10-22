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
          <div class="flex items-center justify-between">
            <div 
              v-for="(stepItem, index) in steps" 
              :key="index"
              class="flex-1"
            >
              <div class="flex items-center">
                <div 
                  class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                  :class="{
                    'bg-green-600 text-white': index < step,
                    'bg-green-600 text-white': index === step,
                    'bg-gray-300 text-gray-600': index > step
                  }"
                >
                  <span v-if="index < step">✓</span>
                  <span v-else>{{ index + 1 }}</span>
                </div>
                <div 
                  v-if="index < steps.length - 1"
                  class="flex-1 h-1 mx-2"
                  :class="{
                    'bg-green-600': index < step,
                    'bg-gray-300': index >= step
                  }"
                ></div>
              </div>
              <p class="mt-2 text-xs text-center text-gray-600">{{ stepItem }}</p>
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

            <div class="space-y-4">
              <!-- Lernfahr- oder Fahrausweis (Required) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Lernfahr- oder Fahrausweis *
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  @change="handleFileUpload($event, 'learner_permit')"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  required
                >
                <p v-if="uploadedFiles.learner_permit" class="mt-1 text-sm text-green-600">
                  ✓ {{ uploadedFiles.learner_permit.name }}
                </p>
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
              <div class="border rounded-md p-4 max-h-60 overflow-y-auto bg-gray-50">
                <h3 class="font-semibold mb-2">Allgemeine Geschäftsbedingungen</h3>
                <div class="text-sm text-gray-700 whitespace-pre-wrap">
                  {{ termsText }}
                </div>
              </div>

              <div class="flex items-start">
                <input
                  v-model="form.acceptedTerms"
                  type="checkbox"
                  required
                  class="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                >
                <label class="ml-2 text-sm text-gray-700">
                  Ich akzeptiere die Allgemeinen Geschäftsbedingungen *
                </label>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="mt-8 flex justify-between">
            <button
              v-if="step > 0"
              type="button"
              @click="step--"
              class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Zurück
            </button>
            <div v-else></div>

            <button
              type="submit"
              :disabled="isSubmitting || (step === 0 && (passwordTooShort || passwordMismatch))"
              class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ step === 3 ? 'Registrierung abschliessen' : 'Weiter' }}
            </button>
          </div>

          <!-- Loading Indicator -->
          <div v-if="isSubmitting" class="mt-4 text-center text-sm text-gray-600">
            Wird verarbeitet...
          </div>
        </form>

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
    const { data, error: completeError } = await useFetch('/api/students/complete-onboarding', {
      method: 'POST',
      body: {
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
    })

    if (completeError.value || !data.value?.success) {
      throw new Error('Registrierung fehlgeschlagen')
    }

    // Success - redirect to login
    alert('Registrierung erfolgreich abgeschlossen! Du kannst dich jetzt anmelden.')
    await navigateTo('/login')

  } catch (err: any) {
    error.value = err.message || 'Fehler beim Abschliessen der Registrierung'
  } finally {
    isSubmitting.value = false
  }
}
</script>

