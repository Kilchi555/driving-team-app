<!-- VERWENDEN SIE NUR DIESE index.vue (keine Middleware nötig!) -->

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <img src="/images/Driving_Team_ch.jpg" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
          <h1 class="text-2xl font-bold">Willkommen</h1>
          <p class="text-blue-100 mt-1">Melden Sie sich in Ihrem Account an</p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="p-6">
        <form @submit.prevent="manualLogin" class="space-y-4">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              v-model="loginEmail"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ihre.email@example.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              v-model="loginPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ihr Passwort"
            />
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label class="ml-2 text-sm text-gray-600">
                Angemeldet bleiben
              </label>
            </div>
            
            <button
              type="button"
              @click="resetPassword"
              class="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Passwort vergessen?
            </button>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading || !loginEmail || !loginPassword"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <span v-if="isLoading">⏳ Anmelden...</span>
            <span v-else>🔑 Anmelden</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center">
          <div class="flex-1 border-t border-gray-300"></div>
          <span class="px-4 text-gray-500 text-sm">oder</span>
          <div class="flex-1 border-t border-gray-300"></div>
        </div>

        <!-- Register Link -->
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-3">
            Noch kein Account?
          </p>
          <button
            @click="goToRegister"
            class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ✨ Kostenlos registrieren
          </button>
        </div>
      </div>
    </div>

    <!-- PASSWORD RESET MODAL (wird nur bei showResetForm=true angezeigt) -->
    <div v-if="showResetForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <!-- Reset Header -->
        <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div class="text-center">
            <h2 class="text-xl font-bold">🔑 Neues Passwort setzen</h2>
            <p class="text-blue-100 mt-1">Geben Sie Ihr neues Passwort ein</p>
          </div>
        </div>
        
        <!-- Reset Content -->
        <div class="p-6">
          <!-- Success Message -->
          <div v-if="resetSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-800 text-sm">{{ resetSuccess }}</p>
          </div>
          
          <!-- Error Message -->
          <div v-if="resetError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-800 text-sm">{{ resetError }}</p>
          </div>
          
          <!-- Reset Form -->
          <form @submit.prevent="updatePassword" class="space-y-4">
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

            <!-- Buttons -->
            <div class="flex space-x-3">
              <button
                type="button"
                @click="showResetForm = false"
                class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                :disabled="!canSubmitReset || isResetting"
                class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg"
              >
                <span v-if="isResetting">⏳ Speichere...</span>
                <span v-else>💾 Speichern</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// Login variables
const loginEmail = ref('')
const loginPassword = ref('')
const isLoading = ref(false)
const rememberMe = ref(false)

// Reset variables
const showResetForm = ref(false)
const resetError = ref('')
const resetSuccess = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isResetting = ref(false)

// Password validation
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

const canSubmitReset = computed(() => {
  return newPassword.value && 
         confirmPassword.value && 
         newPassword.value === confirmPassword.value && 
         passwordIsValid.value
})

// Auth token handling on mount
onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    
    console.log('Page loaded with hash:', hash)
    
    // Check for reset parameter
    if (urlParams.get('reset') === 'true') {
      showResetForm.value = true
      return
    }
    
    // Check for auth tokens in hash
    if (hash.includes('access_token') && hash.includes('refresh_token')) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Password recovery detected')
        
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        
        if (error) {
          resetError.value = `Session-Fehler: ${error.message}`
        } else {
          showResetForm.value = true
          resetSuccess.value = '✅ Reset-Link erfolgreich verarbeitet!'
        }
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
    
  } catch (error: any) {
    console.error('Mount error:', error)
  }
})

// Login function
const manualLogin = async () => {
  if (!loginEmail.value || !loginPassword.value) {
    alert('Bitte geben Sie E-Mail und Passwort ein')
    return
  }
  
  isLoading.value = true
  
  try {
    const email = loginEmail.value.trim().toLowerCase()
    const password = loginPassword.value
    
    console.log('Login attempt:', email)
    
    await supabase.auth.signOut()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        alert(`❌ Login fehlgeschlagen!\n\nBitte überprüfen Sie:\n• E-Mail: ${email}\n• Passwort\n• Groß-/Kleinschreibung\n\n💡 Tipp: Nutzen Sie "Passwort vergessen?"`)
      } else {
        alert(`Fehler: ${error.message}`)
      }
      return
    }
    
    if (data.user) {
      console.log('✅ Login successful')
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      switch (userProfile?.role) {
        case 'admin':
          await navigateTo('/admin')
          break
        case 'staff':
          await navigateTo('/staff')
          break
        default:
          await navigateTo('/dashboard')
      }
    }
    
  } catch (error: any) {
    alert(`Fehler: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

// Password reset request
const resetPassword = async () => {
  if (!loginEmail.value) {
    alert('Bitte geben Sie zuerst Ihre E-Mail-Adresse ein')
    return
  }
  
  const { error } = await supabase.auth.resetPasswordForEmail(
    loginEmail.value.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/?reset=true`
    }
  )
  
  if (error) {
    alert(`Fehler: ${error.message}`)
  } else {
    alert('✅ Reset-E-Mail gesendet! Checken Sie Ihr Postfach.')
  }
}

// Password update
const updatePassword = async () => {
  if (!canSubmitReset.value) return
  
  isResetting.value = true
  
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword.value
    })
    
    if (error) {
      throw error
    }
    
    resetSuccess.value = '🎉 Passwort erfolgreich geändert!'
    resetError.value = ''
    
    newPassword.value = ''
    confirmPassword.value = ''
    
    setTimeout(() => {
      showResetForm.value = false
      resetSuccess.value = ''
    }, 3000)
    
  } catch (error: any) {
    resetError.value = `Fehler: ${error.message}`
  } finally {
    isResetting.value = false
  }
}

// Navigation
const goToRegister = () => {
  navigateTo('/register')
}
</script>