<template>
  <!-- Load tenant-specific register component -->
  <div v-if="isTenantSpecificRoute">
    <component :is="tenantRegisterComponent" :tenant-slug="tenantSlugFromRoute" />
  </div>
  
  <!-- Main registration form -->
  <div v-else class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="bg-gray-100 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <LoadingLogo size="md" class="mb-3" :tenant-id="activeTenantId || undefined" />
          <h1 class="text-2xl font-bold text-gray-700">
          {{ isAdminRegistration ? 'Admin-Account erstellen' :
             serviceType === 'fahrlektion' ? 'Registrierung für Fahrlektionen' : 
             serviceType === 'theorie' ? 'Registrierung für Theorielektion' : 
             serviceType === 'beratung' ? 'Registrierung für Beratung' : 'Registrierung' }}
        </h1>
        </div>
      </div>
                      <!-- Navigation Back -->
        <div class="px-6 py-3 bg-gray-50 border-b">
          <button
            @click="goBack"
            class="text-gray-600 hover:text-gray-800 flex items-center text-sm"
          >
            {{ isAdminRegistration ? '← Zurück zur Firmenregistrierung' : '← Zurück zur Auswahl' }}
          </button>
        </div>

      <!-- Progress Steps -->
      <div class="px-6 py-4 bg-gray-50 border-b">
        <div class="flex items-center justify-center space-x-4">
          <div :class="currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div v-if="requiresLernfahrausweis" class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 2" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div v-if="requiresLernfahrausweis" :class="currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= maxSteps" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= maxSteps ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            {{ requiresLernfahrausweis ? 3 : 2 }}
          </div>
        </div>
        <div class="flex justify-center text-center mt-2 text-xs text-gray-600" :class="requiresLernfahrausweis ? 'space-x-6' : 'space-x-12'">
          <span>Persönliche Daten</span>
          <span v-if="requiresLernfahrausweis">Lernfahrausweis</span>
          <span>Account</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6">
        
        <!-- Step 1: Personal Data -->
        <div v-if="currentStep === 1" class="space-y-6">
          
          <!-- Admin Registration Header -->
          <div v-if="isAdminRegistration" class="text-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-2">👤 Admin-Account erstellen</h2>
            <p class="text-gray-600">Erstellen Sie Ihren Administrator-Account für {{ tenantParam }}</p>
            
            <!-- Pre-filled data notice -->
            <div v-if="prefilledData.first_name || prefilledData.last_name || prefilledData.email || prefilledData.phone" 
                 class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p class="text-blue-800 text-sm">
                <span class="font-medium">ℹ️ Vorausgefüllte Daten:</span> 
                Die Kontaktdaten aus der Firmenregistrierung wurden automatisch übernommen.
              </p>
              <p class="text-blue-700 text-xs mt-1">
                <span class="font-medium">📍 Adresse:</span> 
                Bitte geben Sie hier Ihre <strong>Privatadresse</strong> ein. Falls diese von der Firmenadresse abweicht, können Sie die Felder entsprechend anpassen.
              </p>
            </div>
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

            <!-- Email (for Admin Registration) -->
            <div v-if="isAdminRegistration">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@ihre-firma.ch"
              />
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

          <!-- Categories (only for normal registration) -->
          <div v-if="!isAdminRegistration">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Führerschein-Kategorien *
            </label>
            <div class="space-y-3">
              <div v-for="category in availableCategories" :key="category.code" class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg font-bold text-gray-800">{{ category.code }}</span>
                    <span class="text-sm text-gray-600">{{ category.name }}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">CHF {{ category.price }}/45min</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    :id="`cat-${category.code}`"
                    v-model="formData.categories"
                    :value="category.code"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis Upload (only for Fahrlektionen) -->
        <div v-if="currentStep === 2 && requiresLernfahrausweis" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Lernfahr- oder Führerausweis hochladen</h2>
          </div>

          <!-- Upload Area -->
          <div 
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors cursor-pointer"
            @click="fileInput?.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*,.pdf"
              @change="handleFileUpload"
              class="hidden"
            />
            
            <!-- Upload Prompt -->
            <div v-if="!uploadedImage" class="text-center">
              <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <p class="text-blue-600 font-medium mb-1">Klicken zum Hochladen</p>
              <p class="text-xs text-gray-500">Foto aufnehmen oder aus Galerie wählen</p>
              <p class="text-xs text-gray-400 mt-1">PNG, JPG oder PDF bis 5MB</p>
            </div>

            <!-- Uploaded Image Preview -->
            <div v-if="uploadedImage" class="space-y-4">
              <div class="text-center">
                <img :src="uploadedImage" alt="Lernfahrausweis" class="max-w-full h-64 object-contain mx-auto rounded-lg shadow-md border border-gray-200">
              </div>
              
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <div class="text-2xl">✅</div>
                  <div>
                    <p class="text-green-800 font-semibold">Ausweis hochgeladen</p>
                  </div>
                </div>
              </div>
              
              <!-- Buttons -->
              <div class="flex justify-center">
                <button
                  @click.stop="clearImage"
                  class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  🔄 Anderes Bild wählen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Account & Registrierung (Step 2 for theory/consultation, Step 3 for driving lessons) -->
        <div v-else-if="(currentStep === 2 && !requiresLernfahrausweis) || (currentStep === 3 && requiresLernfahrausweis)" class="space-y-6">
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
                autocomplete="email"
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
                  autocomplete="new-password"
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
                autocomplete="new-password"
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
          v-if="currentStep < maxSteps"
          @click="nextStep"
          :disabled="!canProceed"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Weiter →
        </button>
        
        <button
          v-if="currentStep === maxSteps"
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
import { ref, computed, onMounted, watch, defineAsyncComponent } from 'vue'
import { navigateTo, useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { useTenant } from '~/composables/useTenant'

const supabase = getSupabase()
const route = useRoute()

// Tenant Management
const { loadTenant, tenantSlug, tenantId, currentTenant } = useTenant()

// Get service type from URL parameter
const serviceType = ref(route.query.service as string || 'fahrlektion')

// Get tenant from URL parameter (slug)
const tenantParam = ref(route.query.tenant as string || '')

// Get role from URL parameter (for admin registration)
const roleParam = ref(route.query.role as string || 'client')

// Get pre-filled data from URL parameters (for admin registration)
const prefilledData = ref({
  first_name: route.query.first_name as string || '',
  last_name: route.query.last_name as string || '',
  email: route.query.email as string || '',
  phone: route.query.phone as string || ''
})

// Watch for route changes to update service type and tenant
watch(() => route.query.service, (newService) => {
  if (newService && newService !== serviceType.value) {
    serviceType.value = newService as string
    console.log('🔄 Service type updated from URL:', serviceType.value)
  }
}, { immediate: true })

watch(() => route.query.tenant, (newTenant) => {
  if (newTenant && newTenant !== tenantParam.value) {
    tenantParam.value = newTenant as string
    console.log('🏢 Tenant updated from URL:', tenantParam.value)
    // Load tenant data when tenant parameter changes
    loadTenant(tenantParam.value)
  }
}, { immediate: true })


watch(() => route.query.role, (newRole) => {
  if (newRole && newRole !== roleParam.value) {
    roleParam.value = newRole as string
    console.log('👤 Role updated from URL:', roleParam.value)
  }
}, { immediate: true })

// Watch for pre-filled data changes
watch(() => route.query, (newQuery) => {
  if (roleParam.value === 'admin') {
    // Update pre-filled data when URL changes
    prefilledData.value = {
      first_name: newQuery.first_name as string || '',
      last_name: newQuery.last_name as string || '',
      email: newQuery.email as string || '',
      phone: newQuery.phone as string || ''
    }
    
    // Update form data if fields are empty
    if (!formData.value.firstName && prefilledData.value.first_name) {
      formData.value.firstName = prefilledData.value.first_name
    }
    if (!formData.value.lastName && prefilledData.value.last_name) {
      formData.value.lastName = prefilledData.value.last_name
    }
    if (!formData.value.email && prefilledData.value.email) {
      formData.value.email = prefilledData.value.email
    }
    if (!formData.value.phone && prefilledData.value.phone) {
      formData.value.phone = prefilledData.value.phone
    }
  }
}, { immediate: true })

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const uploadedImage = ref<string | null>(null)
const showPassword = ref(false)

// Refs
const fileInput = ref<HTMLInputElement>()

// LocalStorage key for form data
const FORM_DATA_KEY = 'register_form_data'

// Form data - initialize after computed properties are defined
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
const isAdminRegistration = computed(() => {
  return roleParam.value === 'admin'
})

const activeTenantId = computed(() => {
  return tenantId.value || currentTenant.value?.id || null
})

// Check if this is a tenant-specific route
const isTenantSpecificRoute = computed(() => {
  const currentPath = route.path
  return currentPath.match(/^\/register\/[^\/]+$/)
})

// Extract tenant slug from route
const tenantSlugFromRoute = computed(() => {
  const currentPath = route.path
  const match = currentPath.match(/^\/register\/([^\/]+)$/)
  return match ? match[1] : null
})

// Dynamic component for tenant-specific registration
const tenantRegisterComponent = computed(() => {
  return defineAsyncComponent(() => import('~/pages/register/[tenant].vue'))
})

const requiresLernfahrausweis = computed(() => {
  return serviceType.value === 'fahrlektion' && !isAdminRegistration.value
})

const maxSteps = computed(() => {
  if (isAdminRegistration.value) {
    return 2 // Admin: Personal data + Account
  }
  return requiresLernfahrausweis.value ? 3 : 2
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    if (isAdminRegistration.value) {
      // Admin registration: basic info + address required
      return formData.value.firstName && formData.value.lastName && 
             formData.value.phone && formData.value.email &&
             formData.value.street && formData.value.streetNr && 
             formData.value.zip && formData.value.city
    }
    // Normal registration: all fields required
    return formData.value.firstName && formData.value.lastName && 
           formData.value.birthDate && formData.value.phone && 
           formData.value.street && formData.value.streetNr && 
           formData.value.zip && formData.value.city && 
           formData.value.categories.length > 0
  }
  if (currentStep.value === 2 && requiresLernfahrausweis.value) {
    // Only uploaded image is required (license number field was removed)
    return !!uploadedImage.value
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
  if (canProceed.value && currentStep.value < maxSteps.value) {
    if (isAdminRegistration.value) {
      // Admin registration: go directly to account step
      currentStep.value = 2
    } else if (currentStep.value === 1 && !requiresLernfahrausweis.value) {
      // Skip step 2 (Lernfahrausweis) for theory and consultation
      currentStep.value = 2 // This becomes the account step
    } else {
      currentStep.value++
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    if (isAdminRegistration.value) {
      // Admin registration: go back to step 1
      currentStep.value = 1
    } else if (currentStep.value === 2 && !requiresLernfahrausweis.value) {
      // Skip step 2 (Lernfahrausweis) when going back
      currentStep.value = 1
    } else {
      currentStep.value--
    }
  }
}

const goBack = () => {
  if (isAdminRegistration.value) {
    // For admin registration, go back to tenant registration
    navigateTo('/tenant-register')
  } else {
    const tenant = tenantParam.value || tenantSlug.value || 'driving-team'
    const url = `/auswahl?tenant=${tenant}`
    console.log('🔙 Going back to:', url)
    
    if (typeof navigateTo !== 'undefined') {
      navigateTo(url)
    } else {
      window.location.href = url
    }
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
    
    // 1. ✅ VALIDIERUNG: Prüfe Email-Duplikate (split queries to avoid RLS issues)
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('email', formData.value.email.trim().toLowerCase())
      .eq('is_active', true)
      .maybeSingle()
    
    if (emailCheckError) {
      console.error('Email check error:', emailCheckError)
      throw new Error(`Fehler beim Prüfen der E-Mail-Adresse: ${emailCheckError.message}`)
    }
    
    const { data: existingByPhone, error: phoneCheckError } = await supabase
      .from('users')
      .select('phone, first_name, last_name')
      .eq('phone', formData.value.phone?.trim())
      .eq('is_active', true)
      .maybeSingle()
    
    if (phoneCheckError) {
      console.error('Phone check error:', phoneCheckError)
      throw new Error(`Fehler beim Prüfen der Telefonnummer: ${phoneCheckError.message}`)
    }
    
    // Check for duplicates
    if (existingByEmail) {
      throw new Error(`Diese E-Mail-Adresse ist bereits registriert für ${existingByEmail.first_name} ${existingByEmail.last_name}. Bitte verwenden Sie eine andere E-Mail-Adresse oder loggen Sie sich ein.`)
    }
    
    if (existingByPhone) {
      throw new Error(`Diese Telefonnummer ist bereits registriert für ${existingByPhone.first_name} ${existingByPhone.last_name}. Bitte verwenden Sie eine andere Telefonnummer.`)
    }
    
    // 2. ✅ Auth User erstellen - Trigger erstellt automatisch public.users
    // Get current tenant ID for registration
    const { currentTenant, tenantId } = useTenant()
    let activeTenantId = tenantId.value || currentTenant.value?.id
    
    // Fallback: If no tenant is loaded, derive from domain or use default
    if (!activeTenantId) {
      console.warn('⚠️ No tenant loaded, trying to derive from domain...')
      const hostname = window.location.hostname
      
      // Map domains to tenant slugs
      const domainToSlug: Record<string, string> = {
        'simy.ch': 'simy',
        'www.simy.ch': 'simy',
        'drivingteam.ch': 'driving-team',
        'www.drivingteam.ch': 'driving-team',
        'localhost': 'simy' // Default for development
      }
      
      const tenantSlug = domainToSlug[hostname] || 'simy'
      console.log('🏢 Deriving tenant from domain:', hostname, '->', tenantSlug)
      
      // Load tenant by slug
      try {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .eq('is_active', true)
          .single()
        
        if (!error && tenant) {
          activeTenantId = tenant.id
          console.log('✅ Loaded tenant by slug:', tenantSlug, '->', activeTenantId)
        } else {
          console.error('❌ Failed to load tenant by slug:', error)
          throw new Error('Fehler beim Laden der Mandanten-Daten. Bitte kontaktieren Sie den Support.')
        }
      } catch (e) {
        console.error('❌ Error loading tenant:', e)
        throw new Error('Fehler beim Laden der Mandanten-Daten.')
      }
    }
    
    console.log('🏢 Registering user for tenant:', activeTenantId)
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.value.email.trim().toLowerCase(),
      password: formData.value.password,
      options: {
        data: {
          first_name: formData.value.firstName.trim(),
          last_name: formData.value.lastName.trim(),
          tenant_id: activeTenantId,
          phone: formData.value.phone?.trim() || null,
          birthdate: formData.value.birthDate || null,
          street: formData.value.street?.trim() || null,
          street_nr: formData.value.streetNr?.trim() || null,
          zip: formData.value.zip?.trim() || null,
          city: formData.value.city?.trim() || null,
          category: formData.value.categories || null,
          lernfahrausweis_nr: formData.value.lernfahrausweisNr?.trim() || null
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
    
    // 3. ✅ Warten und dann public.users Eintrag manuell aktualisieren
    // (Falls der Trigger nicht funktioniert oder noch nicht existiert)
    console.log('⏳ Waiting for trigger to create public.users entry...')
    
    let publicUser = null
    let attempts = 0
    const maxAttempts = 10
    
    // Warte auf Trigger-Erstellung oder erstelle manuell
    while (attempts < maxAttempts && !publicUser) {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms warten
      
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle() // Use maybeSingle() to avoid 406 errors when user doesn't exist yet
      
      if (checkError && checkError.code !== 'PGRST116') {
        // Only log non-"no rows" errors
        console.warn('⚠️ Error checking for user:', checkError.message)
      }
      
      if (existingUser) {
        publicUser = existingUser
        console.log('✅ Public user found via trigger:', publicUser.id)
        break
      }
      
      attempts++
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for trigger...`)
    }
    
    // Falls Trigger nicht funktioniert hat, manuell erstellen/aktualisieren
    if (!publicUser) {
      console.log('🔧 Trigger did not create user, creating manually...')
      
      const { data: manualUser, error: manualError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: formData.value.email.trim().toLowerCase(),
          first_name: formData.value.firstName.trim(),
          last_name: formData.value.lastName.trim(),
          phone: formData.value.phone?.trim() || null,
          birthdate: isAdminRegistration.value ? null : formData.value.birthDate || null,
          street: formData.value.street?.trim() || null,
          street_nr: formData.value.streetNr?.trim() || null,
          zip: formData.value.zip?.trim() || null,
          city: formData.value.city?.trim() || null,
          role: isAdminRegistration.value ? 'admin' : 'client',
          tenant_id: activeTenantId,
          category: formData.value.categories && formData.value.categories.length > 0 ? formData.value.categories : null,
          lernfahrausweis_nr: formData.value.lernfahrausweisNr?.trim() || null,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (manualError) {
        console.error('❌ Manual user creation failed:', manualError)
        throw new Error(`Fehler beim Erstellen des Benutzerprofils: ${manualError.message}`)
      }
      
      publicUser = manualUser
      console.log('✅ Manual user creation successful:', publicUser.id)
    } else {
      // Aktualisiere den vom Trigger erstellten User mit vollständigen Daten
      console.log('🔄 Updating trigger-created user with complete data...')
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          phone: formData.value.phone?.trim() || null,
          birthdate: isAdminRegistration.value ? null : formData.value.birthDate || null,
          street: formData.value.street?.trim() || null,
          street_nr: formData.value.streetNr?.trim() || null,
          zip: formData.value.zip?.trim() || null,
          city: formData.value.city?.trim() || null,
          tenant_id: activeTenantId,
          category: isAdminRegistration.value ? null : (formData.value.categories && formData.value.categories.length > 0 ? formData.value.categories : null),
          lernfahrausweis_nr: isAdminRegistration.value ? null : formData.value.lernfahrausweisNr?.trim() || null
        })
        .eq('auth_user_id', authData.user.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ User update failed:', updateError)
        // Nicht kritisch, da Grunddaten bereits vorhanden sind
      } else {
        publicUser = updatedUser
        console.log('✅ User update successful')
      }
    }
    
    // 4. ✅ Upload Lernfahrausweis image to Supabase Storage (if exists)
    if (uploadedImage.value && publicUser) {
      console.log('📸 Uploading Lernfahrausweis image to storage...')
      
      try {
        // Convert base64 to blob
        const base64Data = uploadedImage.value.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })
        
        // Generate unique filename
        const fileName = `${publicUser.id}_lernfahrausweis_${Date.now()}.jpg`
        const filePath = `lernfahrausweise/${fileName}`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/jpeg'
          })
        
        if (uploadError) {
          console.error('❌ Image upload failed:', uploadError)
          // Don't fail registration for image upload error
        } else {
          console.log('✅ Image uploaded successfully:', uploadData.path)
          
          // Storage path is now managed via user_documents table
          // No need to update users table with document URL
        }
      } catch (imageError) {
        console.error('❌ Image processing failed:', imageError)
        // Don't fail registration for image processing error
      }
    }
    
    console.log('🎉 Final user data:', {
      id: publicUser.id,
      email: publicUser.email,
      tenant_id: publicUser.tenant_id,
      category: publicUser.category,
      lernfahrausweis_nr: publicUser.lernfahrausweis_nr,
    })
    
    
    // 4. ✅ Erfolgreiche Registrierung
    if (isAdminRegistration.value) {
      // For admin registration, try to auto-login and redirect to admin dashboard
      try {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.value.email.trim().toLowerCase(),
          password: formData.value.password
        })
        
        if (loginError) {
          console.warn('Auto-login failed, user needs to login manually:', loginError)
          alert('🎉 Admin-Account erfolgreich erstellt!\n\nBitte loggen Sie sich mit Ihren Zugangsdaten ein.')
          await navigateTo('/login')
        } else {
          console.log('✅ Auto-login successful for admin')
          alert('🎉 Admin-Account erfolgreich erstellt!\n\nSie werden automatisch angemeldet...')
          
          // Clear saved form data
          if (process.client) {
            localStorage.removeItem(FORM_DATA_KEY)
          }
          
          await navigateTo('/admin')
        }
      } catch (autoLoginError) {
        console.warn('Auto-login failed:', autoLoginError)
        alert('🎉 Admin-Account erfolgreich erstellt!\n\nBitte loggen Sie sich mit Ihren Zugangsdaten ein.')
        
        // Clear saved form data
        if (process.client) {
          localStorage.removeItem(FORM_DATA_KEY)
        }
        
        await navigateTo('/login')
      }
    } else {
      alert('🎉 Registrierung erfolgreich!\n\nIhr Account wurde erstellt. Bitte prüfen Sie Ihre E-Mails zur Bestätigung und loggen Sie sich dann ein.')
      
      // Clear saved form data after successful registration
      if (process.client) {
        localStorage.removeItem(FORM_DATA_KEY)
      }
      
      await navigateTo('/')
    }
    
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

// Load categories from database with service-specific pricing
const loadCategories = async () => {
  try {
    // Get tenant context from URL parameter or current tenant
    const { currentTenant, tenantId } = useTenant()
    const activeTenantId = tenantId.value || currentTenant.value?.id
    
    console.log('🏢 Loading categories for tenant:', activeTenantId || 'fallback')
    console.log('🔍 Loading categories from database for service:', serviceType.value)
    
    let categories, categoriesError
    
    if (activeTenantId) {
      // Get tenant business_type first
      const { data: tenantData, error: tenantTypeError } = await supabase
        .from('tenants')
        .select('business_type')
        .eq('id', activeTenantId)
        .single()

      if (tenantTypeError) {
        console.warn('⚠️ Could not load tenant data:', tenantTypeError.message)
      }
      
      // Only load categories if business_type is driving_school
      if (tenantData?.business_type !== 'driving_school') {
        console.log('🚫 Categories not available for business_type:', tenantData?.business_type)
        categories = []
        categoriesError = null
      } else {
        // Load tenant-specific categories first
        const { data: tenantCategories, error: tenantError } = await supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', activeTenantId)
          .eq('is_active', true)
          .order('code')
        
        categories = tenantCategories
        categoriesError = tenantError
        
        console.log('🏢 Loaded tenant-specific categories:', categories?.length || 0)
      }
    } else {
      // Fallback: Load global categories (tenant_id = null)
      const { data: globalCategories, error: globalError } = await supabase
        .from('categories')
        .select('*')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('code')
      
      categories = globalCategories
      categoriesError = globalError
      
      console.log('🌐 Loaded global categories:', categories?.length || 0)
    }
    
    // Use fallback only if DB loading failed
    let finalCategories
    if (categoriesError || !categories || categories.length === 0) {
      console.warn('⚠️ Could not load categories from DB, using fallback:', categoriesError?.message || 'No categories found')
      finalCategories = [
        { code: 'B', name: 'Auto', description: 'Personenwagen', price_per_lesson: 95, display_order: 1 },
        { code: 'A', name: 'Motorrad', description: 'Motorrad', price_per_lesson: 95, display_order: 2 },
        { code: 'BE', name: 'Auto + Anhänger', description: 'Personenwagen mit Anhänger', price_per_lesson: 120, display_order: 3 },
        { code: 'C', name: 'LKW', description: 'Lastwagen', price_per_lesson: 170, display_order: 4 },
        { code: 'CE', name: 'LKW + Anhänger', description: 'Lastwagen mit Anhänger', price_per_lesson: 200, display_order: 5 },
        { code: 'D', name: 'Bus', description: 'Autobus', price_per_lesson: 200, display_order: 6 },
        { code: 'BPT', name: 'Berufspersonentransport', description: 'Berufspersonentransport', price_per_lesson: 100, display_order: 7 }
      ]
    } else {
      console.log('✅ Loaded categories from DB:', categories.length)
      finalCategories = categories
    }
    
    // Load pricing rules for the specific service type
    let pricingRules = null
    if (serviceType.value === 'fahrlektion') {
      console.log('🔍 Loading driving lesson pricing rules (base_price) for tenant:', activeTenantId || 'global')
      
      let basePriceRules, basePriceError
      
      if (activeTenantId) {
        // Try to load tenant-specific pricing rules first
        const { data: tenantRules, error: tenantError } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('rule_type', 'base_price')
          .eq('tenant_id', activeTenantId)
          .eq('is_active', true)
        
        if (tenantRules && tenantRules.length > 0) {
          basePriceRules = tenantRules
          basePriceError = tenantError
          console.log('🏢 Using tenant-specific pricing rules:', basePriceRules.length)
        } else {
          // Fallback to global rules
          const { data: globalRules, error: globalError } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('rule_type', 'base_price')
            .is('tenant_id', null)
            .eq('is_active', true)
          
          basePriceRules = globalRules
          basePriceError = globalError
          console.log('🌐 Using global pricing rules as fallback:', basePriceRules?.length || 0)
        }
      } else {
        // Load global rules directly
        const { data: globalRules, error: globalError } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('rule_type', 'base_price')
          .is('tenant_id', null)
          .eq('is_active', true)
        
        basePriceRules = globalRules
        basePriceError = globalError
        console.log('🌐 Loading global pricing rules:', basePriceRules?.length || 0)
      }
      
      if (basePriceError) {
        console.error('❌ Error loading base price rules:', basePriceError)
      } else {
        console.log('✅ Loaded global base price rules:', basePriceRules?.length || 0)
        if (basePriceRules && basePriceRules.length > 0) {
          console.log('📊 Base price rules details:', basePriceRules.map(r => ({
            category_code: r.category_code,
            price_per_minute_rappen: r.price_per_minute_rappen,
            base_duration_minutes: r.base_duration_minutes,
            tenant_id: r.tenant_id
          })))
        } else {
          console.log('⚠️ No global base price rules found - checking what exists...')
          // Debug: Check all base_price rules
          const { data: debugRules } = await supabase
            .from('pricing_rules')
            .select('rule_type, category_code, tenant_id, is_active')
            .eq('rule_type', 'base_price')
          console.log('🔍 All base_price rules in DB:', debugRules)
        }
      }
      pricingRules = basePriceRules
    } else if (serviceType.value === 'theorie') {
      console.log('🔍 Loading theory pricing rules for tenant:', activeTenantId || 'global')
      
      let theoryRules, theoryError
      
      if (activeTenantId) {
        // Try to load tenant-specific theory rules first
        const { data: tenantRules, error: tenantErr } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('rule_type', 'theory')
          .eq('tenant_id', activeTenantId)
          .eq('is_active', true)
        
        if (tenantRules && tenantRules.length > 0) {
          theoryRules = tenantRules
          theoryError = tenantErr
          console.log('🏢 Using tenant-specific theory rules:', theoryRules.length)
        } else {
          // Fallback to global rules
          const { data: globalRules, error: globalErr } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('rule_type', 'theory')
            .is('tenant_id', null)
            .eq('is_active', true)
          
          theoryRules = globalRules
          theoryError = globalErr
          console.log('🌐 Using global theory rules as fallback:', theoryRules?.length || 0)
        }
      } else {
        // Load global rules directly
        const { data: globalRules, error: globalErr } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('rule_type', 'theory')
          .is('tenant_id', null)
          .eq('is_active', true)
        
        theoryRules = globalRules
        theoryError = globalErr
        console.log('🌐 Loading global theory rules:', theoryRules?.length || 0)
      }
      
      if (theoryError) {
        console.error('❌ Error loading theory rules:', theoryError)
      } else {
        console.log('✅ Loaded global theory rules:', theoryRules?.length || 0)
        if (theoryRules && theoryRules.length > 0) {
          console.log('📊 Theory rules details:', theoryRules.map(r => ({
            category_code: r.category_code,
            price_per_minute_rappen: r.price_per_minute_rappen,
            base_duration_minutes: r.base_duration_minutes,
            tenant_id: r.tenant_id
          })))
        } else {
          console.log('⚠️ No global theory rules found - checking what exists...')
          // Debug: Check all theory rules
          const { data: debugRules } = await supabase
            .from('pricing_rules')
            .select('rule_type, category_code, tenant_id, is_active')
            .eq('rule_type', 'theory')
          console.log('🔍 All theory rules in DB:', debugRules)
        }
      }
      pricingRules = theoryRules
    } else if (serviceType.value === 'beratung') {
      console.log('🔍 Loading consultation pricing rules for tenant:', activeTenantId || 'global')
      
      let consultationRules, consultationError
      
      if (activeTenantId) {
        // Try to load tenant-specific consultation rules first
        const { data: tenantRules, error: tenantErr } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('rule_type', 'consultation')
          .eq('tenant_id', activeTenantId)
          .eq('is_active', true)
        
        if (tenantRules && tenantRules.length > 0) {
          consultationRules = tenantRules
          consultationError = tenantErr
          console.log('🏢 Using tenant-specific consultation rules:', consultationRules.length)
        } else {
          // Fallback to global rules
          const { data: globalRules, error: globalErr } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('rule_type', 'consultation')
            .is('tenant_id', null)
            .eq('is_active', true)
          
          consultationRules = globalRules
          consultationError = globalErr
          console.log('🌐 Using global consultation rules as fallback:', consultationRules?.length || 0)
        }
      } else {
        // Load global rules directly
        const { data: globalRules, error: globalErr } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('rule_type', 'consultation')
          .is('tenant_id', null)
          .eq('is_active', true)
        
        consultationRules = globalRules
        consultationError = globalErr
        console.log('🌐 Loading global consultation rules:', consultationRules?.length || 0)
      }
      
      if (consultationError) {
        console.error('❌ Error loading consultation rules:', consultationError)
      } else {
        console.log('✅ Loaded global consultation rules:', consultationRules?.length || 0)
        if (consultationRules && consultationRules.length > 0) {
          console.log('📊 Consultation rules details:', consultationRules.map(r => ({
            category_code: r.category_code,
            price_per_minute_rappen: r.price_per_minute_rappen,
            base_duration_minutes: r.base_duration_minutes,
            tenant_id: r.tenant_id
          })))
        } else {
          console.log('⚠️ No global consultation rules found - checking what exists...')
          // Debug: Check all consultation rules
          const { data: debugRules } = await supabase
            .from('pricing_rules')
            .select('rule_type, category_code, tenant_id, is_active')
            .eq('rule_type', 'consultation')
          console.log('🔍 All consultation rules in DB:', debugRules)
        }
      }
      pricingRules = consultationRules
    }
    
    // Map categories with service-specific pricing
    console.log('🗂️ Mapping categories for service:', serviceType.value, 'Categories:', finalCategories.length, 'Pricing rules:', pricingRules?.length || 0)
    
    availableCategories.value = finalCategories.map(cat => {
      // All services now use pricing rules - no more price_per_lesson column
      let price = 95 // Fallback
      
      // Find matching pricing rule for this category
      if (pricingRules) {
        const rule = pricingRules.find(r => r.category_code === cat.code)
        if (rule) {
          const calculatedPrice = (rule.price_per_minute_rappen * rule.base_duration_minutes) / 100 // Convert to CHF
          price = Math.round(calculatedPrice) // Apply rounding like in admin interface
          console.log(`💰 Found pricing rule for ${cat.code} (${serviceType.value}):`, {
            rule_type: rule.rule_type,
            price_per_minute_rappen: rule.price_per_minute_rappen,
            base_duration_minutes: rule.base_duration_minutes,
            calculated_price_raw: calculatedPrice,
            calculated_price_rounded: price
          })
        } else {
          console.log(`⚠️ No pricing rule found for category: ${cat.code} (service: ${serviceType.value})`)
        }
      } else {
        console.log(`⚠️ No pricing rules loaded for service: ${serviceType.value}`)
      }
      
      const result = {
        code: cat.code || cat.name,
        name: cat.description || cat.name,
        price: price
      }
      
      console.log(`📋 Mapped category ${cat.code}:`, result)
      return result
    })
    
    console.log('✅ Final available categories:', availableCategories.value)
  } catch (error) {
    console.error('Error loading categories:', error)
  }
}

// Load categories on mount and when service type changes
onMounted(async () => {
  // Skip for tenant-specific routes
  if (isTenantSpecificRoute.value) {
    console.log('🔓 Skipping general register logic for tenant-specific route:', route.path)
    return
  }
  
  // Restore form data from localStorage if available
  if (process.client) {
    const savedData = localStorage.getItem(FORM_DATA_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        console.log('📦 Restoring form data from cache')
        Object.assign(formData.value, parsed)
        if (parsed.uploadedImage) {
          uploadedImage.value = parsed.uploadedImage
        }
      } catch (e) {
        console.error('Error parsing saved form data:', e)
      }
    }
  }
  
  // Pre-fill form data for admin registration (overrides saved data)
  if (roleParam.value === 'admin') {
    formData.value.firstName = prefilledData.value.first_name || ''
    formData.value.lastName = prefilledData.value.last_name || ''
    formData.value.email = prefilledData.value.email || ''
    formData.value.phone = prefilledData.value.phone || ''
  }
  
  // Load tenant if tenant parameter is provided
  if (tenantParam.value) {
    console.log('🏢 Loading tenant from URL parameter:', tenantParam.value)
    await loadTenant(tenantParam.value)
  } else if (route.query.tenant) {
    console.log('🏢 Loading tenant from route query:', route.query.tenant)
    await loadTenant(route.query.tenant as string)
  } else if (!isAdminRegistration.value) {
    // For customer registration: Try to derive tenant from domain
    console.log('🏢 Customer registration - checking domain...')
    const hostname = window.location.hostname
    
    // Check if we're on the platform domain (simy.ch) vs a tenant domain
    const isPlatformDomain = hostname === 'simy.ch' || hostname === 'www.simy.ch' || hostname === 'localhost'
    
    if (isPlatformDomain) {
      // On platform domain: Customer registration is NOT allowed
      // Redirect to tenant registration instead (no blocking alert)
      console.error('❌ Customer registration on platform domain not allowed')
      await navigateTo('/tenant-register')
      return
    }
    
    // On tenant-specific domain: derive tenant from domain
    const domainToSlug: Record<string, string> = {
      'drivingteam.ch': 'driving-team',
      'www.drivingteam.ch': 'driving-team'
      // Add more tenant domains here as needed
    }
    
    const derivedSlug = domainToSlug[hostname]
    if (derivedSlug) {
      console.log('🏢 Derived tenant slug from domain:', derivedSlug)
      await loadTenant(derivedSlug)
    } else {
      console.error('❌ Unknown domain, cannot derive tenant:', hostname)
      alert('Bitte verwenden Sie den Registrierungs-Link Ihrer Fahrschule oder wählen Sie einen Anbieter aus.')
      await navigateTo('/auswahl')
      return
    }
  }
  
  // Verify tenant is loaded for customer registration
  if (!isAdminRegistration.value && !activeTenantId.value) {
    console.error('❌ No tenant loaded for customer registration, redirecting to tenant selection')
    alert('Bitte wählen Sie zuerst einen Anbieter aus.')
    await navigateTo('/auswahl')
    return
  }
  
  loadCategories()
})

// Watch for service type changes and reload categories (only on actual changes, not initial value)
watch(serviceType, (newValue, oldValue) => {
  if (oldValue !== undefined && newValue !== oldValue) {
    console.log('🔄 Service type changed from', oldValue, 'to', newValue, '- reloading categories')
    loadCategories()
  }
})

// Watch for tenant changes and reload categories
watch(() => tenantParam.value, (newTenant, oldTenant) => {
  if (oldTenant !== undefined && newTenant !== oldTenant && newTenant) {
    console.log('🏢 Tenant changed from', oldTenant, 'to', newTenant, '- reloading categories')
    loadCategories()
  }
})

// Auto-save form data to localStorage
watch(formData, (newData) => {
  if (process.client) {
    try {
      // Save without password for security
      const dataToSave = {
        ...newData,
        password: '',
        confirmPassword: '',
        uploadedImage: uploadedImage.value
      }
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(dataToSave))
    } catch (e) {
      console.error('Error saving form data:', e)
    }
  }
}, { deep: true })
</script>