<template>
  <div class="min-h-screen flex items-center justify-center p-4" :style="{ background: `linear-gradient(to bottom right, ${(primaryColor || '#2563eb')}15, #64748b15)` }">
    <div class="w-full max-w-md">
      <!-- Logo außerhalb - oberhalb der Card -->
      <div class="text-center mb-6">
        <img 
          v-if="getLogo('header')" 
          :src="getLogo('header') || ''" 
          class="h-10 w-auto mx-auto drop-shadow-lg" 
          :alt="`${brandName || 'Simy'} Logo`"
        >
        <div 
          v-else 
          class="w-10 h-10 mx-auto bg-white rounded-lg shadow-lg flex items-center justify-center"
        >
          <span class="text-xl font-bold" :style="{ color: primaryColor || '#2563eb' }">{{ (brandName || 'S').charAt(0).toUpperCase() }}</span>
        </div>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-xl shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="text-white p-6 text-center" :style="{ background: primaryColor || '#2563eb' }">
          <h1 class="text-2xl font-bold">Passwort zurücksetzen</h1>
          <p class="text-white text-opacity-90 mt-1">Bitte geben Sie Ihr neues Passwort ein</p>
        </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Wird überprüft...</p>
        </div>

        <!-- Invalid Token -->
        <div v-else-if="!isValidToken" class="space-y-4">
          <div class="flex justify-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          
          <h2 class="text-xl font-bold text-gray-900 text-center">Link ungültig oder abgelaufen</h2>
          <p class="text-gray-600 text-center">{{ tokenError }}</p>
          
          <div class="space-y-3 pt-4">
            <NuxtLink
              :to="getLoginRoute()"
              class="block text-center text-white font-semibold py-2 px-4 rounded-lg transition-colors hover:opacity-90"
              :style="{ background: primaryColor || '#2563eb' }"
            >
              Zur Anmeldung
            </NuxtLink>
          </div>
        </div>

        <!-- Password Reset Form -->
        <form v-else @submit.prevent="handleReset" class="space-y-4">
          <!-- New Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="12"
                @input="onPasswordChange"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:ring-blue-600"
                placeholder="Mindestens 12 Zeichen"
                :disabled="isSubmitting"
              >
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                :disabled="isSubmitting"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
            </div>
            <div class="mt-2 text-xs">
              <p class="font-medium mb-2 text-gray-700">Passwort-Anforderungen:</p>
              <ul class="space-y-2">
                <li class="flex items-center gap-2">
                  <span v-if="form.password.length >= 12" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-red-500 font-bold">✗</span>
                  <span :class="form.password.length >= 12 ? 'text-green-600 font-medium' : 'text-red-500'">
                    Mindestens 12 Zeichen
                  </span>
                </li>
                <li class="flex items-center gap-2">
                  <span v-if="hasUpperCase" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-red-500 font-bold">✗</span>
                  <span :class="hasUpperCase ? 'text-green-600 font-medium' : 'text-red-500'">
                    Mindestens ein Großbuchstabe
                  </span>
                </li>
                <li class="flex items-center gap-2">
                  <span v-if="hasNumber" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-red-500 font-bold">✗</span>
                  <span :class="hasNumber ? 'text-green-600 font-medium' : 'text-red-500'">
                    Mindestens eine Zahl
                  </span>
                </li>
                <li class="flex items-center gap-2">
                  <span v-if="isCheckingCompromise" class="text-gray-400">⟳</span>
                  <span v-else-if="form.password.length >= 12 && !isCompromised" class="text-green-600 font-bold">✓</span>
                  <span v-else-if="isCompromised" class="text-red-500 font-bold">✗</span>
                  <span v-else class="text-gray-400 font-bold">○</span>
                  <span :class="{
                    'text-green-600 font-medium': form.password.length >= 12 && !isCompromised,
                    'text-red-500': isCompromised,
                    'text-gray-400': form.password.length < 12 && !isCompromised
                  }">
                    <span v-if="isCheckingCompromise">Prüfe Sicherheit...</span>
                    <span v-else-if="isCompromised">Passwort wurde {{ compromiseCount.toLocaleString() }}x gestohlen</span>
                    <span v-else>Nicht in Datenlecks gefunden</span>
                  </span>
                </li>
                <li v-if="!personalInfoError" class="flex items-center gap-2">
                  <span v-if="form.password.length >= 3" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-gray-400 font-bold">○</span>
                  <span :class="form.password.length >= 3 ? 'text-green-600 font-medium' : 'text-gray-400'">
                    Keine persönlichen Daten
                  </span>
                </li>
                <li v-else class="flex items-center gap-2">
                  <span class="text-red-500 font-bold">✗</span>
                  <span class="text-red-500">{{ personalInfoError }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Confirm Password Input -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen
            </label>
            <div class="relative">
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent focus:ring-blue-600"
                placeholder="Passwort wiederholen"
                :disabled="isSubmitting"
              >
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                :disabled="isSubmitting"
              >
                <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
            </div>
            <p v-if="form.confirmPassword && !passwordsMatch" class="text-xs text-red-600 mt-1 flex items-center gap-2">
              <span class="text-red-500 font-bold">✗</span>
              Passwörter stimmen nicht überein
            </p>
            <p v-else-if="form.confirmPassword && passwordsMatch" class="text-xs text-green-600 mt-1 flex items-center gap-2">
              <span class="text-green-600 font-bold">✓</span>
              Passwörter stimmen überein
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isSubmitting || !isFormValid"
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            :style="{ background: primaryColor || '#2563eb' }"
          >
            <span v-if="isSubmitting">Wird aktualisiert...</span>
            <span v-else>Passwort zurücksetzen</span>
          </button>
        </form>

      </div>
      <!-- Ende Card -->
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="isSuccess" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-6">
          <img 
            v-if="getLogo('header')" 
            :src="getLogo('header') || ''" 
            class="h-10 w-auto mx-auto drop-shadow-lg" 
            :alt="`${brandName || 'Simy'} Logo`"
          >
          <div 
            v-else 
            class="w-10 h-10 mx-auto bg-white rounded-lg shadow-lg flex items-center justify-center"
          >
            <span class="text-xl font-bold" :style="{ color: primaryColor || '#2563eb' }">{{ (brandName || 'S').charAt(0).toUpperCase() }}</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="text-white p-6 text-center" :style="{ background: primaryColor || '#2563eb' }">
            <h2 class="text-2xl font-bold">Passwort zurückgesetzt!</h2>
          </div>

        <!-- Content -->
        <div class="p-6 space-y-4 text-center">
          <div class="flex justify-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          
          <p class="text-gray-600">Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p>
          
          <NuxtLink
            :to="getLoginRoute()"
            class="block text-white font-semibold py-2 px-4 rounded-lg transition-colors hover:opacity-90"
            :style="{ background: primaryColor || '#2563eb' }"
          >
            Zur Anmeldung
          </NuxtLink>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { logger } from '~/utils/logger'
import { useRoute, definePageMeta, navigateTo } from '#imports'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useUIStore } from '~/stores/ui'
import { checkPasswordCompromised, checkPasswordPersonalInfo, debounce } from '~/utils/passwordSecurity'

// Meta
definePageMeta({
  layout: false
})

// Composables
const { showSuccess, showError } = useUIStore()
const { 
  currentTenantBranding,
  isLoading: isLoadingBranding,
  error: brandingError,
  loadTenantBranding,
  brandName,
  primaryColor,
  getLogo
} = useTenantBranding()

// State
const route = useRoute()
const isLoading = ref(true)
const isSubmitting = ref(false)
const isValidToken = ref(false)
const isSuccess = ref(false)
const tokenError = ref('')
const error = ref<string | null>(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const resetToken = ref('')
const isCheckingCompromise = ref(false)
const isCompromised = ref(false)
const compromiseCount = ref(0)
const personalInfoError = ref('')

const form = ref({
  password: '',
  confirmPassword: ''
})

// Computed
const hasUpperCase = computed(() => /[A-Z]/.test(form.value.password))
const hasLowerCase = computed(() => /[a-z]/.test(form.value.password))
const hasNumber = computed(() => /\d/.test(form.value.password))
const passwordsMatch = computed(() => form.value.password === form.value.confirmPassword && form.value.password.length > 0)
const isFormValid = computed(() => 
  form.value.password.length >= 12 && 
  hasUpperCase.value && 
  hasNumber.value && 
  passwordsMatch.value &&
  !isCompromised.value &&
  !personalInfoError.value
)

// Debounced compromise check
const checkCompromiseDebounced = debounce(async () => {
  if (form.value.password.length < 12) {
    isCompromised.value = false
    compromiseCount.value = 0
    return
  }

  isCheckingCompromise.value = true
  const result = await checkPasswordCompromised(form.value.password)
  isCheckingCompromise.value = false
  
  isCompromised.value = result.isCompromised
  compromiseCount.value = result.count
  
  if (result.error) {
    logger.warn('⚠️ Could not check password compromise:', result.error)
  }
}, 800)

// Check personal info
const checkPersonalInfo = () => {
  if (form.value.password.length < 3) {
    personalInfoError.value = ''
    return
  }

  const result = checkPasswordPersonalInfo(form.value.password, {
    email: undefined,
    firstName: undefined,
    lastName: undefined
  })

  personalInfoError.value = result.isValid ? '' : (result.reason || '')
}

// Watch password changes
const onPasswordChange = () => {
  checkPersonalInfo()
  checkCompromiseDebounced()
}

// Methods
const validateToken = async () => {
  try {
    const token = route.query.token as string
    if (!token) {
      tokenError.value = 'Kein Reset-Token gefunden. Bitte fordern Sie einen neuen Link an.'
      isValidToken.value = false
      return
    }

    resetToken.value = token

    // Verify token exists and is not expired
    const response = await $fetch('/api/auth/validate-reset-token', {
      method: 'POST',
      body: { token }
    }) as any

    if (response?.valid) {
      isValidToken.value = true
      logger.debug('✅ Token is valid')
    } else {
      isValidToken.value = false
      tokenError.value = response?.message || 'Reset-Token ist ungültig oder abgelaufen.'
    }
  } catch (err: any) {
    console.error('❌ Token validation error:', err)
    isValidToken.value = false
    tokenError.value = 'Fehler beim Überprüfen des Links. Bitte versuchen Sie es später erneut.'
  } finally {
    isLoading.value = false
  }
}

const handleReset = async () => {
  if (!isFormValid.value) {
    error.value = 'Bitte erfüllen Sie alle Passwort-Anforderungen.'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    logger.debug('🔐 Submitting password reset...')
    
    const response = await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken.value,
        newPassword: form.value.password
      }
    }) as any

    if (response?.success) {
      logger.debug('✅ Password reset successful')
      isSuccess.value = true
      showSuccess('Passwort erfolgreich zurückgesetzt!', 'Sie können sich jetzt mit Ihrem neuen Passwort anmelden.')
      
      // Redirect to login/slug after 2 seconds
      setTimeout(() => {
        navigateTo(getLoginRoute())
      }, 2000)
    } else {
      error.value = response?.message || 'Fehler beim Zurücksetzen des Passworts.'
      showError('Fehler', error.value || 'Fehler beim Zurücksetzen des Passworts.')
    }
  } catch (err: any) {
    console.error('❌ Password reset error:', err)
    const errorMsg = err?.data?.statusMessage || err?.message || 'Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es später erneut.'
    error.value = errorMsg
    showError('Fehler', errorMsg)
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
const getLoginRoute = () => {
  const tenantSlug = route.query.tenant as string
  if (tenantSlug) {
    return `/${tenantSlug}`
  }
  return '/login'
}

onMounted(async () => {
  // Load tenant branding if tenant slug is provided
  const tenantSlug = route.query.tenant as string
  if (tenantSlug) {
    logger.debug('🏢 Loading branding for tenant:', tenantSlug)
    try {
      await loadTenantBranding(tenantSlug)
      logger.debug('✅ Tenant branding loaded:', { primaryColor: primaryColor.value, brandName: brandName.value })
    } catch (err) {
      console.error('❌ Failed to load tenant branding:', err)
    }
  } else {
    logger.debug('ℹ️ No tenant slug provided, using default branding')
  }
  
  await validateToken()
})
</script>

