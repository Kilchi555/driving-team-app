<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <LoadingLogo size="lg" class="mx-auto mb-3" />
          <h1 class="text-2xl font-bold">Passwort zurücksetzen</h1>
          <p class="text-blue-100 mt-1">Geben Sie Ihr neues Passwort ein</p>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Verarbeite Reset-Link...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="text-6xl mb-4">❌</div>
          <h3 class="text-lg font-semibold text-red-600 mb-2">Reset-Link ungültig</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="goToLogin"
            class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Zurück zum Login
          </button>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center py-8">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-lg font-semibold text-green-600 mb-2">Passwort erfolgreich geändert!</h3>
          <p class="text-gray-600 mb-4">Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p>
          <button
            @click="goToLogin"
            class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Zum Login
          </button>
        </div>

        <!-- Reset Form -->
        <form v-else @submit.prevent="updatePassword" class="space-y-4">
          <div class="text-center mb-6">
            <div class="text-4xl mb-2">🔑</div>
            <p class="text-green-600 font-medium">✅ Reset-Link ist gültig!</p>
            <p class="text-gray-600 text-sm">Geben Sie Ihr neues Passwort ein</p>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort *
            </label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="12"
              @input="onPasswordChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mindestens 12 Zeichen"
            />
            <div class="mt-2 text-xs">
              <p class="font-medium mb-2 text-gray-700">Passwort-Anforderungen:</p>
              <ul class="space-y-2">
                <li class="flex items-center gap-2">
                  <span v-if="passwordChecks.length" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-red-500 font-bold">✗</span>
                  <span :class="passwordChecks.length ? 'text-green-600 font-medium' : 'text-red-500'">
                    Mindestens 12 Zeichen
                  </span>
                </li>
                <li class="flex items-center gap-2">
                  <span v-if="passwordChecks.uppercase" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-red-500 font-bold">✗</span>
                  <span :class="passwordChecks.uppercase ? 'text-green-600 font-medium' : 'text-red-500'">
                    Mindestens ein Großbuchstabe
                  </span>
                </li>
                <li class="flex items-center gap-2">
                  <span v-if="passwordChecks.number" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-red-500 font-bold">✗</span>
                  <span :class="passwordChecks.number ? 'text-green-600 font-medium' : 'text-red-500'">
                    Mindestens eine Zahl
                  </span>
                </li>
                <li class="flex items-center gap-2">
                  <span v-if="isCheckingCompromise" class="text-gray-400">⟳</span>
                  <span v-else-if="newPassword.length >= 12 && !isCompromised" class="text-green-600 font-bold">✓</span>
                  <span v-else-if="isCompromised" class="text-red-500 font-bold">✗</span>
                  <span v-else class="text-gray-400 font-bold">○</span>
                  <span :class="{
                    'text-green-600 font-medium': newPassword.length >= 12 && !isCompromised,
                    'text-red-500': isCompromised,
                    'text-gray-400': newPassword.length < 12 && !isCompromised
                  }">
                    <span v-if="isCheckingCompromise">Prüfe Sicherheit...</span>
                    <span v-else-if="isCompromised">Passwort wurde {{ compromiseCount.toLocaleString() }}x gestohlen</span>
                    <span v-else>Nicht in Datenlecks gefunden</span>
                  </span>
                </li>
                <li v-if="!personalInfoError" class="flex items-center gap-2">
                  <span v-if="newPassword.length >= 3" class="text-green-600 font-bold">✓</span>
                  <span v-else class="text-gray-400 font-bold">○</span>
                  <span :class="newPassword.length >= 3 ? 'text-green-600 font-medium' : 'text-gray-400'">
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

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              @input="checkPersonalInfo"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="confirmPassword && newPassword !== confirmPassword" 
               class="text-red-600 text-sm mt-1 flex items-center gap-2">
              <span class="text-red-500 font-bold">✗</span>
              Passwörter stimmen nicht überein
            </p>
            <p v-else-if="confirmPassword && newPassword === confirmPassword"
               class="text-green-600 text-sm mt-1 flex items-center gap-2">
              <span class="text-green-600 font-bold">✓</span>
              Passwörter stimmen überein
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!isPasswordValid || isSubmitting"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <span v-if="isSubmitting">⏳ Passwort wird gesetzt...</span>
            <span v-else-if="!isPasswordValid">⚠️ Bitte erfüllen Sie alle Anforderungen</span>
            <span v-else>🔒 Passwort speichern</span>
          </button>
          
          <!-- Helper text when requirements not met -->
          <p v-if="!isPasswordValid && !isSubmitting && (newPassword.length > 0 || confirmPassword.length > 0)" 
             class="text-xs text-center text-red-600 mt-2">
            Sie können erst fortfahren, wenn alle Passwort-Anforderungen erfüllt sind
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { checkPasswordCompromised, checkPasswordPersonalInfo, debounce } from '~/utils/passwordSecurity'
import { logger } from '~/utils/logger'

const supabase = getSupabase()

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const isCheckingCompromise = ref(false)
const isCompromised = ref(false)
const compromiseCount = ref(0)
const personalInfoError = ref('')

// Computed
const passwordChecks = computed(() => ({
  length: newPassword.value.length >= 12,
  uppercase: /[A-Z]/.test(newPassword.value),
  number: /[0-9]/.test(newPassword.value)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.number
})

const isPasswordValid = computed(() => {
  return passwordIsValid.value &&
         newPassword.value === confirmPassword.value &&
         !isCompromised.value &&
         !personalInfoError.value
})

const canSubmit = computed(() => {
  return newPassword.value && 
         confirmPassword.value && 
         newPassword.value === confirmPassword.value && 
         passwordIsValid.value &&
         !isCompromised.value &&
         !personalInfoError.value
})

// Debounced compromise check
const checkCompromiseDebounced = debounce(async () => {
  if (newPassword.value.length < 12) {
    isCompromised.value = false
    compromiseCount.value = 0
    return
  }

  isCheckingCompromise.value = true
  const result = await checkPasswordCompromised(newPassword.value)
  isCheckingCompromise.value = false
  
  isCompromised.value = result.isCompromised
  compromiseCount.value = result.count
  
  if (result.error) {
    logger.warn('⚠️ Could not check password compromise:', result.error)
  }
}, 800)

// Check personal info
const checkPersonalInfo = () => {
  if (newPassword.value.length < 3) {
    personalInfoError.value = ''
    return
  }

  const result = checkPasswordPersonalInfo(newPassword.value, {
    email: undefined, // No email context in reset flow
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
const updatePassword = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value
    })
    
    if (updateError) {
      throw updateError
    }
    
    logger.debug('Password updated successfully:', data)
    success.value = true
    
    // Auto-redirect nach 3 Sekunden
    setTimeout(() => {
      goToLogin()
    }, 3000)
    
  } catch (err: any) {
    console.error('Password update error:', err)
    error.value = `Fehler beim Passwort-Update: ${err.message}`
  } finally {
    isSubmitting.value = false
  }
}

const goToLogin = () => {
  navigateTo('/')
}

// Handle the reset session on mount
onMounted(async () => {
  try {
    logger.debug('=== PASSWORD RESET PAGE LOADED ===')
    
    // Check URL for auth tokens
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    logger.debug('URL tokens found:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken 
    })
    
    if (accessToken && refreshToken) {
      // Set the session from URL tokens
      const { data, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (setSessionError) {
        throw setSessionError
      }
      
      logger.debug('Session set successfully:', data.session?.user?.email)
      isLoading.value = false
    } else {
      // Check if we already have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      if (session) {
        logger.debug('Existing session found:', session.user.email)
        isLoading.value = false
      } else {
        throw new Error('Kein gültiger Reset-Token gefunden. Bitte fordern Sie einen neuen Reset-Link an.')
      }
    }
    
  } catch (err: any) {
    console.error('Reset page error:', err)
    error.value = err.message
    isLoading.value = false
  }
})
</script>