<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <img src="/images/Driving_Team_ch.jpg" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
          <h1 class="text-2xl font-bold">Fahrschüler Registrierung</h1>
          <p class="text-blue-100 mt-1">Erstellen Sie Ihr Konto für Fahrstunden</p>
        </div>
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
        <div class="flex justify-center mt-2 space-x-16 text-xs text-gray-600">
          <span>Persönliche Daten</span>
          <span>Lernfahrausweis</span>
          <span>Account</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6">
        
        <!-- Step 1: Personal Data -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">👤 Persönliche Daten</h2>
            <p class="text-gray-600">Bitte geben Sie Ihre persönlichen Daten ein</p>
          </div>

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
                  <span class="text-xs mt-1">{{ category.name }}</span>
                  <span class="text-xs text-gray-500">CHF {{ category.price }}/45min</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis Upload -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">📄 Lernfahrausweis hochladen</h2>
            <p class="text-gray-600">Laden Sie ein Foto oder Scan Ihres Lernfahrausweises hoch</p>
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
        </div>

        <!-- Step 3: Account Creation -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">🔐 Account erstellen</h2>
            <p class="text-gray-600">Erstellen Sie Ihren Login-Account</p>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse *
            </label>
            <input
              v-model="formData.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="max.mustermann@example.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort *
            </label>
            <input
              v-model="formData.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mindestens 8 Zeichen"
            />
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

          <!-- Password Confirmation -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="formData.confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" 
               class="text-red-600 text-sm mt-1">
              Passwörter stimmen nicht überein
            </p>
          </div>

          <!-- Terms -->
          <div class="flex items-start space-x-3">
            <input
              v-model="formData.acceptTerms"
              type="checkbox"
              required
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label class="text-sm text-gray-700">
              Ich akzeptiere die <a href="#" class="text-blue-600 hover:underline">Allgemeinen Geschäftsbedingungen</a> 
              und die <a href="#" class="text-blue-600 hover:underline">Datenschutzerklärung</a> *
            </label>
          </div>
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

// FINALE LÖSUNG: Registrierung mit separater public.users Tabelle

const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    // 1. Auth User erstellen (für Login)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.value.email,
      password: formData.value.password,
      options: {
        data: {
          first_name: formData.value.firstName,
          last_name: formData.value.lastName
        }
      }
    })
    
    if (authError) throw authError
    
    if (!authData.user?.id) {
      throw new Error('Benutzer-ID nicht erhalten')
    }
    
    console.log('Auth User created:', authData.user.id)
    
    // 2. Profil-Daten in public.users speichern
    let { data: userData, error: profileError } = await supabase
      .from('users')
      .insert({
        // WICHTIG: Verwende die auth.user.id als id
        id: authData.user.id,
        email: formData.value.email,
        role: 'client',
        first_name: formData.value.firstName,
        last_name: formData.value.lastName,
        phone: formData.value.phone,
        birthdate: formData.value.birthDate,
        street: formData.value.street,
        street_nr: formData.value.streetNr,
        zip: formData.value.zip,
        city: formData.value.city,
        category: formData.value.categories.join(','),
        lernfahrausweis_url: formData.value.lernfahrausweisNr,
        is_active: true
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('Profile error:', profileError)
      
      // Fallback: Falls public.users bereits existiert, update stattdessen
      if (profileError.code === '23505') { // Unique constraint violation
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({
            email: formData.value.email,
            role: 'client',
            first_name: formData.value.firstName,
            last_name: formData.value.lastName,
            phone: formData.value.phone,
            birthdate: formData.value.birthDate,
            street: formData.value.street,
            street_nr: formData.value.streetNr,
            zip: formData.value.zip,
            city: formData.value.city,
            category: formData.value.categories.join(','),
            lernfahrausweis_url: formData.value.lernfahrausweisNr,
            is_active: true
          })
          .eq('id', authData.user.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        userData = updateData
      } else {
        throw profileError
      }
    }
    
    console.log('Profile created:', userData)
    
    // 3. Lernfahrausweis-Bild hochladen
    if (uploadedImage.value) {
      try {
        const blob = await fetch(uploadedImage.value).then(r => r.blob())
        const fileName = `learner_permit_${authData.user.id}_${Date.now()}.jpg`
        
        // Upload in bestehenden learner-permits bucket
        const { error: uploadError } = await supabase.storage
          .from('learner-permits')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (!uploadError) {
          // Update user mit Bild-Pfad
          await supabase
            .from('users')
            .update({ lernfahrausweis_url: fileName })
            .eq('id', authData.user.id)
          
          console.log('Image uploaded:', fileName)
        } else {
          console.warn('Image upload failed:', uploadError)
          // Nicht kritisch - weiter ohne Bild
        }
      } catch (uploadError) {
        console.warn('Image upload error:', uploadError)
      }
    }
    
    // 4. Erfolg!
    alert('🎉 Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.')
    await navigateTo('/')
    
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Spezifische Fehlermeldungen
    let errorMessage = 'Unbekannter Fehler'
    
    if (error.message?.includes('User already registered')) {
      errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.'
    } else if (error.message?.includes('duplicate key')) {
      errorMessage = 'Benutzer existiert bereits. Versuchen Sie sich anzumelden.'
    } else if (error.message?.includes('invalid email')) {
      errorMessage = 'Ungültige E-Mail-Adresse.'
    } else if (error.message?.includes('weak password')) {
      errorMessage = 'Passwort zu schwach. Mindestens 8 Zeichen, 1 Großbuchstabe, 1 Zahl erforderlich.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(`Fehler bei der Registrierung: ${errorMessage}`)
    
    // Bei Auth-Erfolg aber Profile-Fehler: User zur Vervollständigung weiterleiten
    if (error.code === '23505' && error.table === 'users') {
      alert('Ihr Account wurde erstellt, aber das Profil konnte nicht gespeichert werden. Bitte loggen Sie sich ein und vervollständigen Sie Ihr Profil.')
      await navigateTo('/')
    }
    
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