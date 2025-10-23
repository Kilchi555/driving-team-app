<!-- pages/driving-team/register.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="bg-gray-100 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <LoadingLogo size="xl" class="mb-3" :tenant-id="currentTenant?.id || undefined" />
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

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail *
              </label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="max@example.com"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+41 79 123 45 67"
              />
            </div>

            <!-- Birth Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum
              </label>
              <input
                v-model="formData.birthDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <!-- Street -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Strasse
              </label>
              <input
                v-model="formData.street"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Musterstrasse"
              />
            </div>

            <!-- Street Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hausnummer
              </label>
              <input
                v-model="formData.streetNr"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123"
              />
            </div>

            <!-- ZIP -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                PLZ
              </label>
              <input
                v-model="formData.zip"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="8001"
              />
            </div>

            <!-- City -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ort
              </label>
              <input
                v-model="formData.city"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Zürich"
              />
            </div>
          </div>

          <!-- Categories Selection (only for non-admin) -->
          <div v-if="!isAdminRegistration && availableCategories.length > 0" class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">Kategorien auswählen</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label 
                v-for="category in availableCategories" 
                :key="category.id"
                class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="formData.categories"
                  :value="category.id"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div class="font-medium text-gray-900">{{ category.name }}</div>
                  <div v-if="category.description" class="text-sm text-gray-500">{{ category.description }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Next Button -->
          <div class="flex justify-end">
            <button
              @click="nextStep"
              :disabled="!isStep1Valid"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Weiter
            </button>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis (if required) -->
        <div v-if="currentStep === 2 && requiresLernfahrausweis" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900">Lernfahrausweis</h2>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Lernfahrausweis-Nummer *
            </label>
            <input
              v-model="formData.lernfahrausweisNr"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456789"
            />
          </div>

          <!-- Navigation Buttons -->
          <div class="flex justify-between">
            <button
              @click="prevStep"
              class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Zurück
            </button>
            <button
              @click="nextStep"
              :disabled="!formData.lernfahrausweisNr"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Weiter
            </button>
          </div>
        </div>

        <!-- Final Step: Account Creation -->
        <div v-if="currentStep === maxSteps" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900">Account erstellen</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <!-- Confirm Password -->
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
            </div>
          </div>

          <!-- Terms and Conditions -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">Allgemeine Geschäftsbedingungen</h3>
            <div class="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
              <p class="text-sm text-gray-700">
                {{ termsText || 'Lade AGB...' }}
              </p>
            </div>
            <label class="flex items-start space-x-3">
              <input
                v-model="formData.acceptTerms"
                type="checkbox"
                required
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
              />
              <span class="text-sm text-gray-700">
                Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiere sie. *
              </span>
            </label>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex justify-between">
            <button
              @click="prevStep"
              class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Zurück
            </button>
            <button
              @click="submitRegistration"
              :disabled="!isFinalStepValid || isSubmitting"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSubmitting ? 'Wird erstellt...' : 'Account erstellen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, navigateTo } from '#app/composables/router'
import { getSupabase } from '~/utils/supabase'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useTenant } from '~/composables/useTenant'

// Tenant Management
const { loadTenant, tenantSlug, tenantId, currentTenant } = useTenant()

const route = useRoute()
const supabase = getSupabase()

// Get tenant from URL parameter (slug) - for /driving-team/login, the tenant is "driving-team"
const tenantParam = ref('driving-team')

// Form data
const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  street: '',
  streetNr: '',
  zip: '',
  city: '',
  categories: [] as number[],
  lernfahrausweisNr: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const availableCategories = ref<any[]>([])
const termsText = ref('')

// Load tenant data (using the composable function)

// Load categories
const loadCategories = async () => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', currentTenant.value?.id)
      .eq('is_active', true)
      .order('code')
    
    if (error) throw error
    availableCategories.value = categories || []
  } catch (error) {
    console.error('❌ Error loading categories:', error)
  }
}

// Load terms
const loadTerms = async () => {
  try {
    const { data: policies, error } = await supabase
      .from('policies')
      .select('content')
      .eq('tenant_id', currentTenant.value?.id)
      .eq('type', 'terms')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    termsText.value = policies?.content || 'Keine AGB verfügbar.'
  } catch (error) {
    console.error('❌ Error loading terms:', error)
    termsText.value = 'Fehler beim Laden der AGB.'
  }
}

// Computed properties
const activeTenantId = computed(() => {
  return tenantId.value || currentTenant.value?.id || null
})

const requiresLernfahrausweis = computed(() => {
  return formData.value.categories.some(catId => {
    const category = availableCategories.value.find(c => c.id === catId)
    return category?.requires_lernfahrausweis
  })
})

const maxSteps = computed(() => {
  return requiresLernfahrausweis.value ? 3 : 2
})

const isStep1Valid = computed(() => {
  return formData.value.firstName && 
         formData.value.lastName && 
         formData.value.email &&
         (!requiresLernfahrausweis.value || formData.value.categories.length > 0)
})

const isFinalStepValid = computed(() => {
  return formData.value.password && 
         formData.value.confirmPassword &&
         formData.value.password === formData.value.confirmPassword &&
         formData.value.password.length >= 8 &&
         formData.value.acceptTerms
})

// Methods
const nextStep = () => {
  if (currentStep.value < maxSteps.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const goBack = () => {
  navigateTo('/driving-team')
}

const submitRegistration = async () => {
  if (!isFinalStepValid.value) return
  
  isSubmitting.value = true
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.value.email.trim().toLowerCase(),
      password: formData.value.password,
      options: {
        data: {
          first_name: formData.value.firstName.trim(),
          last_name: formData.value.lastName.trim(),
          tenant_id: currentTenant.value?.id,
          phone: formData.value.phone?.trim() || null,
          birthdate: formData.value.birthDate || null,
          street: formData.value.street?.trim() || null,
          street_nr: formData.value.streetNr?.trim() || null,
          zip: formData.value.zip?.trim() || null,
          city: formData.value.city?.trim() || null,
          role: 'client',
          category: formData.value.categories.length > 0 ? formData.value.categories : null,
          lernfahrausweis_nr: formData.value.lernfahrausweisNr?.trim() || null,
          is_active: true
        }
      }
    })

    if (authError) throw authError

    console.log('✅ Registration successful:', authData)
    
    // Redirect to success page or login
    await navigateTo('/driving-team?registered=true')
    
  } catch (error: any) {
    console.error('❌ Registration error:', error)
    alert('Fehler bei der Registrierung: ' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

// Initialize
onMounted(async () => {
  try {
    console.log('🏢 Loading tenant:', tenantParam.value)
    await loadTenant(tenantParam.value)
    console.log('✅ Tenant loaded:', currentTenant.value)
    await loadCategories()
    await loadTerms()
  } catch (error) {
    console.error('❌ Error initializing:', error)
    await navigateTo('/auswahl')
  }
})
</script>
