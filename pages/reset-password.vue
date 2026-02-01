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

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'


// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

// Computed
const passwordChecks = computed(() => ({
  length: newPassword.value.length >= 8,
  uppercase: /[A-Z]/.test(newPassword.value),
  number: /[0-9]/.test(newPassword.value)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.number
})

const canSubmit = computed(() => {
  return newPassword.value && 
         confirmPassword.value && 
         newPassword.value === confirmPassword.value && 
         passwordIsValid.value
})

// Methods
const updatePassword = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    const { data, error: updateError } = await $fetch('/api/auth/manage', { method: 'POST', body: { action: 'update-user', attributes:{
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
    const { data, error: setSessionError } = await $fetch('/api/auth/manage', { method: 'POST', body: { action: 'set-session',{
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
    const { data: { user: sessionUser }, error: sessionError } = await $fetch('/api/auth/manage', { method: 'POST', body: { action: 'get-session', access_token: authStore.session?.access_token } }); const session = sessionUser ? { user: sessionUser } : null
      
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