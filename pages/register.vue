<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="bg-gray-100 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <img src="public/images/Driving_Team_Logo.png" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
          <h1 class="text-2xl font-bold text-gray-700">Registrierung</h1>
        </div>
      </div>
                      <!-- Navigation Back -->
        <div class="px-6 py-3 bg-gray-50 border-b">
          <button
            @click="goBack"
            class="text-gray-600 hover:text-gray-800 flex items-center text-sm"
          >
            ← Zurück zur Auswahl
          </button>
        </div>

      <!-- Progress Steps -->
      <div class="px-6 py-4 bg-gray-50 border-b">
        <div class="flex items-center justify-center space-x-4">
          <div :class="currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 2" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 3" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            3
          </div>
        </div>
        <div class="flex justify-center text-center mt-2 space-x-6 text-xs text-gray-600">
          <span>Persönliche Daten</span>
          <span>Lernfahrausweis</span>
          <span>Account</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6">
        
        <!-- Step 1: Personal Data -->
        <div v-if="currentStep === 1" class="space-y-6">

          <!-- Personal Information Form -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- First Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorname *
              </label>
              <input
                v-model="formData.firstName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Max"
              />
            </div>

            <!-- Last Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nachname *
              </label>
              <input
                v-model="formData.lastName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mustermann"
              />
            </div>

            <!-- Birth Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum *
              </label>
              <input
                v-model="formData.birthDate"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon *
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                required
                @blur="normalizePhone"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="079 123 45 67"
              />
              <p class="text-xs text-gray-500 mt-1">Format: +41791234567</p>
            </div>

            <!-- Street -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Strasse *
              </label>
              <input
                v-model="formData.street"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Musterstrasse"
              />
            </div>

            <!-- Street Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hausnummer *
              </label>
              <input
                v-model="formData.streetNr"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123"
              />
            </div>

            <!-- ZIP -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                PLZ *
              </label>
              <input
                v-model="formData.zip"
                type="text"
                required
                pattern="[0-9]{4}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="8000"
              />
            </div>

            <!-- City -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ort *
              </label>
              <input
                v-model="formData.city"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Zürich"
              />
            </div>
          </div>

          <!-- Categories -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Führerschein-Kategorien *
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="category in availableCategories" :key="category.code" class="relative">
                <input
                  :id="`cat-${category.code}`"
                  v-model="formData.categories"
                  :value="category.code"
                  type="checkbox"
                  class="sr-only"
                />
                <label
                  :for="`cat-${category.code}`"
                  :class="formData.categories.includes(category.code) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'"
                  class="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <span class="text-lg font-bold">{{ category.code }}</span>
                  <span class="text-xs mt-1 text-center">{{ category.name }}</span>
                  <span class="text-xs text-gray-500">CHF {{ category.price }}/45min</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis Upload -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">📄 Lernfahr- oder Führerausweis hochladen</h2>
          </div>

          <!-- Upload Area -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <!-- Upload Buttons -->
            <div v-if="!uploadedImage" class="text-center space-y-4">
              <div class="text-6xl text-gray-400 mb-4">📄</div>
              
              <!-- Camera Button -->
              <button
                @click="openCamera"
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mr-4"
              >
                📸 Foto aufnehmen
              </button>
              
              <!-- File Upload -->
              <div class="relative inline-block">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  @change="handleFileUpload"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  📁 Datei auswählen
                </button>
              </div>
              
              <p class="text-sm text-gray-500 mt-4">
                Unterstützte Formate: JPG, PNG<br>
                Maximale Dateigröße: 5MB
              </p>
            </div>

            <!-- Uploaded Image Preview -->
            <div v-if="uploadedImage" class="space-y-4">
              <div class="text-center">
                <img :src="uploadedImage" alt="Lernfahrausweis" class="max-w-full h-64 object-contain mx-auto rounded-lg shadow-md">
              </div>
              
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <p class="text-green-800 font-medium">✅ Lernfahrausweis erfolgreich hochgeladen!</p>
                <p class="text-green-600 text-sm mt-1">Das Bild wird mit Ihrer Registrierung gespeichert.</p>
              </div>
              
              <!-- Buttons -->
              <div class="flex justify-center space-x-4">
                <button
                  @click="clearImage"
                  class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  🗑️ Neues Bild
                </button>
              </div>
            </div>
          </div>

          <!-- Camera Modal -->
          <div v-if="showCamera" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 class="text-lg font-semibold mb-4">📸 Foto aufnehmen</h3>
              
              <video ref="videoElement" autoplay class="w-full rounded-lg mb-4"></video>
              <canvas ref="canvasElement" class="hidden"></canvas>
              
              <div class="flex justify-between space-x-4">
                <button
                  @click="closeCamera"
                  class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  @click="capturePhoto"
                  class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                >
                  📸 Aufnehmen
                </button>
              </div>
            </div>
          </div>
                    <!-- Lernfahrausweis Number (Manual Entry) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Lernfahrausweis-Nummer *
            </label>
            <input
              v-model="formData.lernfahrausweisNr"
              type="text"
              required
              pattern="L[0-9]{6,10}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. L123456789"
            />
            <p class="text-xs text-gray-500 mt-1">Format: L + 6-10 Ziffern</p>
          </div>
        </div>

        <!-- Schritt 3: Account & Registrierung -->
        <div v-else-if="currentStep === 3" class="space-y-6">
          <div class="text-center mb-6">
            <div class="text-4xl mb-2">🔐</div>
            <h3 class="text-xl font-semibold text-gray-900">Account erstellen</h3>
            <p class="text-gray-600">E-Mail und Passwort für Ihren Zugang</p>
          </div>

          <!-- WICHTIG: Form Element um die Passwort-Felder -->
          <form @submit.prevent="submitRegistration" class="space-y-4">
            <!-- E-Mail -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="ihre.email@beispiel.ch"
              />
            </div>

            <!-- Passwort -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Passwort *
              </label>
              <div class="relative">
                <input
                  v-model="formData.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Sicheres Passwort wählen"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              
              <!-- Passwort-Validierung -->
              <div class="mt-2 space-y-1">
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.length ? '✓' : '○' }} Mindestens 8 Zeichen
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.uppercase ? '✓' : '○' }} Großbuchstabe
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.number ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.number ? '✓' : '○' }} Zahl
                  </span>
                </div>
              </div>
            </div>

            <!-- Passwort bestätigen -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestätigen *
              </label>
              <input
                v-model="formData.confirmPassword"
                type="password"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Passwort wiederholen"
              />
              <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" 
                class="text-red-600 text-sm mt-1">
                Passwörter stimmen nicht überein
              </p>
            </div>

            <!-- Nutzungsbedingungen -->
            <div class="flex items-start space-x-3">
              <input
                v-model="formData.acceptTerms"
                type="checkbox"
                id="terms"
                required
                class="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label for="terms" class="text-sm text-gray-700">
                Ich akzeptiere die 
                <a href="/terms" target="_blank" class="text-green-600 hover:text-green-800 underline">
                  Nutzungsbedingungen
                </a> 
                und die 
                <a href="/privacy" target="_blank" class="text-green-600 hover:text-green-800 underline">
                  Datenschutzerklärung
                </a>
              </label>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="!canSubmit || isSubmitting"
              class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              <span v-if="isSubmitting">⏳ Registriere...</span>
              <span v-else>✨ Registrierung abschließen</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Navigation -->
      <div class="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between">
        <button
          v-if="currentStep > 1"
          @click="prevStep"
          class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          ← Zurück
        </button>
        <div v-else></div>

        <button
          v-if="currentStep < 3"
          @click="nextStep"
          :disabled="!canProceed"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Weiter →
        </button>
        
        <button
          v-if="currentStep === 3"
          @click="submitRegistration"
          :disabled="!canSubmit || isSubmitting"
          class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <span v-if="isSubmitting">⏳ Registrierung...</span>
          <span v-else>✅ Registrieren</span>
        </button>
      </div>

      <!-- Login Link -->
      <div class="px-6 py-3 text-center border-t">
        <p class="text-gray-600 text-sm">
          Bereits registriert?
          <button 
            @click="navigateTo('/')"
            class="text-blue-600 hover:text-blue-800 font-semibold ml-1"
          >
            Hier anmelden
          </button>
        </p>
      </div>
    </div>
  </div>


</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const uploadedImage = ref<string | null>(null)
const showCamera = ref(false)
const showPassword = ref(false)

// Refs
const fileInput = ref<HTMLInputElement>()
const videoElement = ref<HTMLVideoElement>()
const canvasElement = ref<HTMLCanvasElement>()

// Form data
const formData = ref({
  // Personal data
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  street: '',
  streetNr: '',
  zip: '',
  city: '',
  categories: [] as string[],
  lernfahrausweisNr: '',
  
  // Account data
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

// Available categories
const availableCategories = ref([
  { code: 'B', name: 'Auto', price: 95 },
  { code: 'A', name: 'Motorrad', price: 95 },
  { code: 'BE', name: 'Auto + Anhänger', price: 120 },
  { code: 'C', name: 'LKW', price: 170 },
  { code: 'CE', name: 'LKW + Anhänger', price: 200 },
  { code: 'D', name: 'Bus', price: 200 },
  { code: 'BPT', name: 'Berufspersonentransport', price: 100 }
])

// Computed
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return formData.value.firstName && formData.value.lastName && 
           formData.value.birthDate && formData.value.phone && 
           formData.value.street && formData.value.streetNr && 
           formData.value.zip && formData.value.city && 
           formData.value.categories.length > 0
  }
  if (currentStep.value === 2) {
    return formData.value.lernfahrausweisNr && uploadedImage.value
  }
  return true
})

const canSubmit = computed(() => {
  return formData.value.email && 
         formData.value.password && 
         formData.value.confirmPassword === formData.value.password && 
         formData.value.acceptTerms && 
         passwordIsValid.value
})

const passwordChecks = computed(() => ({
  length: formData.value.password.length >= 8,
  uppercase: /[A-Z]/.test(formData.value.password),
  number: /[0-9]/.test(formData.value.password)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.number
})

// Methods
const normalizePhone = () => {
  let phone = formData.value.phone.replace(/[^0-9+]/g, '')
  
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+41' + phone.substring(1)
  } else if (phone.startsWith('41') && phone.length === 11) {
    phone = '+' + phone
  }
  
  formData.value.phone = phone
}

const nextStep = () => {
  if (canProceed.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  currentStep.value--
}

const goBack = () => {
  if (typeof navigateTo !== 'undefined') {
    navigateTo('/auswahl')
  } else {
    window.location.href = '/auswahl'
  }
}

// Camera functions
const openCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }
    })
    showCamera.value = true
    
    await nextTick()
    if (videoElement.value) {
      videoElement.value.srcObject = stream
    }
  } catch (error) {
    console.error('Camera access denied:', error)
    alert('Kamera-Zugriff verweigert. Bitte laden Sie eine Datei hoch.')
  }
}

const closeCamera = () => {
  if (videoElement.value?.srcObject) {
    const stream = videoElement.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
  }
  showCamera.value = false
}

const capturePhoto = () => {
  if (videoElement.value && canvasElement.value) {
    const canvas = canvasElement.value
    const video = videoElement.value
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    uploadedImage.value = imageDataUrl
    
    closeCamera()
  }
}

// File upload
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Datei zu groß! Maximale Größe: 5MB')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const clearImage = () => {
  uploadedImage.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    console.log('🚀 Starting registration with trigger-based approach...')
    
    // 1. ✅ VALIDIERUNG: Prüfe nur Auth-User (nicht public.users, da Trigger das macht)
    const { data: existingAuthUsers, error: authCheckError } = await supabase
      .from('users')
      .select('email, phone, first_name, last_name')
      .or(`email.eq.${formData.value.email.trim().toLowerCase()},phone.eq.${formData.value.phone?.trim()}`)
      .eq('is_active', true)
    
    if (authCheckError) {
      throw new Error('Fehler beim Prüfen der Daten')
    }
    
    // Prüfe auf Duplikate
    if (existingAuthUsers && existingAuthUsers.length > 0) {
      const emailDuplicate = existingAuthUsers.find(user => 
        user.email === formData.value.email.trim().toLowerCase()
      )
      
      if (emailDuplicate) {
        throw new Error(`Diese E-Mail-Adresse ist bereits registriert für ${emailDuplicate.first_name} ${emailDuplicate.last_name}. Bitte verwenden Sie eine andere E-Mail-Adresse oder loggen Sie sich ein.`)
      }
      
      const phoneDuplicate = existingAuthUsers.find(user => 
        user.phone === formData.value.phone?.trim()
      )
      
      if (phoneDuplicate) {
        throw new Error(`Diese Telefonnummer ist bereits registriert für ${phoneDuplicate.first_name} ${phoneDuplicate.last_name}. Bitte verwenden Sie eine andere Telefonnummer.`)
      }
    }
    
    // 2. ✅ Auth User erstellen - Trigger erstellt automatisch public.users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.value.email.trim().toLowerCase(),
      password: formData.value.password,
      options: {
        data: {
          first_name: formData.value.firstName.trim(),
          last_name: formData.value.lastName.trim()
        }
      }
    })
    
    if (authError) {
      if (authError.message?.includes('User already registered')) {
        throw new Error('Diese E-Mail-Adresse ist bereits registriert. Bitte loggen Sie sich ein oder verwenden Sie eine andere E-Mail-Adresse.')
      }
      throw authError
    }
    
    if (!authData?.user?.id) {
      throw new Error('Benutzer-ID nicht erhalten')
    }
    
    console.log('✅ Auth User created:', authData.user.id)
    
    // 3. ✅ Warte und prüfe bis Trigger-User existiert, dann ergänze Daten
    console.log('⏳ Waiting for trigger to create base user...')
    
    let attempts = 0
    let triggerUser = null
    
    // Warte bis der Trigger den User erstellt hat (max 5 Sekunden)
    while (attempts < 10 && !triggerUser) {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms warten
      
      const { data: checkUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()
      
      if (!checkError && checkUser) {
        triggerUser = checkUser
        console.log('✅ Trigger user found:', triggerUser.id)
        break
      }
      
      attempts++
      console.log(`⏳ Attempt ${attempts}/10: Waiting for trigger user...`)
    }
    
    if (!triggerUser) {
      console.error('❌ Trigger user not created after 5 seconds')
      throw new Error('Benutzer wurde erstellt, aber Profil ist unvollständig. Bitte wenden Sie sich an den Support.')
    }
    
    // 4. ✅ Jetzt die zusätzlichen Daten ergänzen
    console.log('📝 Updating user with additional data...')
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        // Ergänze nur die zusätzlichen Daten (Basis wurde vom Trigger erstellt)
        phone: formData.value.phone?.trim() || null,
        birthdate: formData.value.birthDate || null,
        street: formData.value.street?.trim() || null,
        street_nr: formData.value.streetNr?.trim() || null,
        zip: formData.value.zip?.trim() || null,
        city: formData.value.city?.trim() || null,
        category: formData.value.categories.join(','),
        lernfahrausweis_nr: formData.value.lernfahrausweisNr?.trim() || null,
        lernfahrausweis_url: uploadedImage.value || null
      })
      .eq('id', triggerUser.id) // Verwende die ID vom Trigger-User
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Profile update error:', updateError)
      console.log('ℹ️ Basic profile exists, but additional data could not be saved')
      // Nicht kritisch - User kann sich trotzdem einloggen
    } else {
      console.log('✅ Profile completed with additional data:', updatedUser)
    }
    
    console.log('✅ Complete registration successful:', updatedUser || 'Basic profile created by trigger')
    
    // 4. ✅ Erfolgreiche Registrierung
    alert('🎉 Registrierung erfolgreich!\n\nIhr Account wurde erstellt. Bitte prüfen Sie Ihre E-Mails zur Bestätigung und loggen Sie sich dann ein.')
    await navigateTo('/')
    
  } catch (error: any) {
    console.error('❌ Registration failed:', error)
    
    let errorMessage = error.message || 'Unbekannter Fehler bei der Registrierung'
    
    // Spezifische Fehlermeldungen
    if (errorMessage.includes('duplicate key') || errorMessage.includes('already registered')) {
      errorMessage = 'Diese Daten sind bereits registriert. Bitte verwenden Sie andere Angaben oder loggen Sie sich ein.'
    } else if (errorMessage.includes('Invalid email')) {
      errorMessage = 'Ungültige E-Mail-Adresse. Bitte prüfen Sie Ihre Eingabe.'
    } else if (errorMessage.includes('Password') || errorMessage.includes('weak password')) {
      errorMessage = 'Passwort zu schwach. Mindestens 8 Zeichen, 1 Großbuchstabe und 1 Zahl erforderlich.'
    }
    
    // ✅ BENUTZERFREUNDLICH: Zeige Fehler an, ohne Eingaben zu verlieren
    alert(`❌ Registrierung nicht möglich:\n\n${errorMessage}\n\nBitte korrigieren Sie die Eingaben und versuchen Sie es erneut.`)
    
  } finally {
    isSubmitting.value = false
  }
}

// Load categories from database
onMounted(async () => {
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    if (categories) {
      availableCategories.value = categories.map(cat => ({
        code: cat.code || cat.name,
        name: cat.description || cat.name,
        price: cat.price_per_lesson || 95
      }))
    }
  } catch (error) {
    console.error('Error loading categories:', error)
  }
})
</script>