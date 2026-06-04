<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(to bottom right, #7C3AED15, #64748b15);">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header -->
      <div class="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <LoadingLogo size="lg" class="mx-auto mb-3" />
          <h1 class="text-2xl font-bold">Passwort zurücksetzen</h1>
          <p class="text-violet-100 mt-1">Geben Sie Ihr neues Passwort ein</p>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style="border-bottom-color: #7C3AED;"></div>
          <p class="text-gray-600">Verarbeite Reset-Link...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="text-6xl mb-4">❌</div>
          <h3 class="text-lg font-semibold text-red-600 mb-2">Reset-Link ungültig</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="goToLogin"
            class="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-lg"
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
            class="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded-lg"
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
              :type="showPw ? 'text' : 'password'"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Mindestens 12 Zeichen"
            />
            <div class="flex items-center justify-between mt-2">
              <button type="button" @click="useGeneratedPassword" class="text-xs font-semibold text-violet-600 underline">
                Sicheres Passwort vorschlagen
              </button>
              <button type="button" @click="showPw = !showPw" class="text-xs text-gray-500 hover:text-gray-700">
                {{ showPw ? 'Verbergen' : 'Anzeigen' }}
              </button>
            </div>
            <div class="mt-2 space-y-1">
              <p class="text-sm" :class="newPassword.length >= 12 ? 'text-green-600' : 'text-gray-400'">
                {{ newPassword.length >= 12 ? '✓' : '○' }} Mindestens 12 Zeichen
              </p>
              <!-- zxcvbn strength bar -->
              <div v-if="zxcvbnScore !== null" class="mt-2">
                <div class="flex gap-1 h-1.5">
                  <div v-for="i in 4" :key="i" class="flex-1 rounded-full transition-colors duration-300"
                    :class="i <= zxcvbnScore ? [
                      zxcvbnScore <= 1 ? 'bg-red-500' :
                      zxcvbnScore === 2 ? 'bg-yellow-400' :
                      zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500'
                    ] : 'bg-gray-200'"
                  />
                </div>
                <p class="text-xs mt-1" :class="
                  zxcvbnScore <= 1 ? 'text-red-500' :
                  zxcvbnScore === 2 ? 'text-yellow-600' :
                  zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'
                ">
                  {{ strengthLabel }}<span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
                </p>
              </div>
              <!-- HIBP -->
              <p v-if="hibpStatus === 'checking'" class="text-xs text-gray-400">⏳ Sicherheitsprüfung läuft...</p>
              <p v-else-if="hibpStatus === 'pwned'" class="text-xs text-red-600 font-medium">✗ Passwort {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks gefunden – bitte ein anderes wählen</p>
              <p v-else-if="hibpStatus === 'safe'" class="text-xs text-green-600">✓ Nicht in bekannten Datenlecks gefunden</p>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="confirmPassword"
              :type="showPw ? 'text' : 'password'"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="confirmPassword && newPassword !== confirmPassword" 
               class="text-red-600 text-sm mt-1">
              Passwörter stimmen nicht überein
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!canSubmit || isSubmitting"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <span v-if="isSubmitting">⏳ Passwort wird gesetzt...</span>
            <span v-else>🔒 Passwort speichern</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo } from '#app'
import { usePasswordStrength, generateStrongPassword } from '~/composables/usePasswordStrength'


// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const showPw = ref(false)

// Unified password policy (length + zxcvbn strength + HIBP breach check)
const { zxcvbnScore, hibpStatus, hibpCount, strengthLabel, evaluate, isPasswordAcceptable } = usePasswordStrength()
watch(newPassword, (pw) => evaluate(pw))

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  newPassword.value = pw
  confirmPassword.value = pw
  showPw.value = true
  evaluate(pw)
}

const canSubmit = computed(() =>
  !!newPassword.value &&
  newPassword.value === confirmPassword.value &&
  isPasswordAcceptable(newPassword.value)
)

// Methods
const updatePassword = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    const { data, error: updateError } = await $fetch('/api/auth/manage', { 
      method: 'POST', 
      body: { 
        action: 'update-user', 
        attributes: {
          password: newPassword.value
        }
      }
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
      const { data, error: setSessionError } = await $fetch('/api/auth/manage', { 
        method: 'POST', 
        body: { 
          action: 'set-session',
          access_token: accessToken,
          refresh_token: refreshToken
        }
      })
      
      if (setSessionError) {
        throw setSessionError
      }
      
      logger.debug('Session set successfully:', data.session?.user?.email)
      isLoading.value = false
    } else {
      // Check if we already have a valid session using httpOnly cookies
      const currentUserResponse = await $fetch('/api/auth/current-user').catch(() => null)
      const session = currentUserResponse?.user ? { user: currentUserResponse.user } : null
      
      if (!session) {
        throw new Error('No valid session found')
      }
      
      if (session) {
        logger.debug('Existing session found:', session.user.email)
        isLoading.value = false
      } else {
        throw new Error('Kein gültiger Reset-Token gefunden. Bitte fordern Sie einen neuen Reset-Link an.')
      }
    }
    
  } catch (err) {
    console.error('Reset page error:', err)
    error.value = err?.message
    isLoading.value = false
  }
})
</script>