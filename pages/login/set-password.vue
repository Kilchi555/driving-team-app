<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Logo -->
      <div class="flex justify-center mb-6">
        <LoadingLogo size="lg" class="mx-auto" />
      </div>
      
      <h2 class="text-center text-3xl font-bold text-gray-900 mb-2">
        Passwort festlegen
      </h2>
      <p class="text-center text-sm text-gray-600 mb-8">
        Legen Sie Ihr Passwort fest, um Ihr Konto zu aktivieren
      </p>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Success State -->
        <div v-if="isSuccess" class="text-center">
          <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span class="text-green-600 text-2xl">✅</span>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Passwort erfolgreich festgelegt!</h3>
          <p class="text-sm text-gray-600 mb-6">
            Sie können sich jetzt mit Ihren Zugangsdaten anmelden.
          </p>
          <NuxtLink 
            :to="`/login/${tenantSlug}`"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Zur Anmeldung
          </NuxtLink>
        </div>

        <!-- Password Setup Form -->
        <form v-else @submit.prevent="setPassword" class="space-y-6">
          <!-- User Info Display -->
          <div v-if="userInfo" class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-blue-600 font-medium">
                  {{ userInfo.first_name?.[0] }}{{ userInfo.last_name?.[0] }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900">
                  {{ userInfo.first_name }} {{ userInfo.last_name }}
                </p>
                <p class="text-sm text-gray-600">{{ userInfo.email }}</p>
                <p class="text-xs text-blue-600">
                  {{ userInfo.role === 'staff' ? '👨‍🏫 Fahrlehrer' : '🔧 Sub-Admin' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Password Fields -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="password" class="block text-sm font-medium text-gray-700">
                Neues Passwort
              </label>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="text-xs text-gray-500 underline"
                >
                  {{ showPassword ? 'Verbergen' : 'Anzeigen' }}
                </button>
                <button
                  type="button"
                  @click="useGeneratedPassword"
                  class="text-xs font-semibold text-blue-600 underline"
                >
                  Sicheres Passwort vorschlagen
                </button>
              </div>
            </div>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="12"
              autocomplete="new-password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mindestens 12 Zeichen"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Passwort bestätigen
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="12"
              autocomplete="new-password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort wiederholen"
            />
          </div>

          <!-- Password strength + breach check -->
          <div class="text-xs space-y-1">
            <p :class="password.length >= 12 ? 'text-green-600' : 'text-gray-500'">
              {{ password.length >= 12 ? '✓' : '○' }} Mindestens 12 Zeichen
            </p>

            <div v-if="zxcvbnScore !== null">
              <div class="flex gap-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1.5 flex-1 rounded-full"
                  :class="i <= zxcvbnScore
                    ? (zxcvbnScore <= 1 ? 'bg-red-500' : zxcvbnScore === 2 ? 'bg-yellow-400' : zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500')
                    : 'bg-gray-200'"
                ></div>
              </div>
              <p class="mt-1" :class="zxcvbnScore <= 1 ? 'text-red-500' : zxcvbnScore === 2 ? 'text-yellow-600' : zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'">
                {{ strengthLabel }}<span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
              </p>
            </div>

            <div v-if="hibpStatus !== 'idle'">
              <span v-if="hibpStatus === 'checking'" class="text-gray-400">⏳ Sicherheitsprüfung läuft…</span>
              <span v-else-if="hibpStatus === 'pwned'" class="text-red-600 font-medium">
                ✗ Dieses Passwort taucht {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks auf – bitte ein anderes wählen.
              </span>
              <span v-else-if="hibpStatus === 'safe'" class="text-green-600">✓ Passwort sieht sicher aus</span>
            </div>

            <p :class="passwordsMatch ? 'text-green-600' : 'text-gray-500'">
              {{ passwordsMatch ? '✓' : '○' }} Passwörter stimmen überein
            </p>

          </div>

          <!-- Error Display -->
          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-600">❌ {{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!isValidPassword || isLoading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isLoading">Speichere...</span>
            <span v-else>🔐 Passwort festlegen</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from '#app'
import { usePasswordStrength, generateStrongPassword } from '~/composables/usePasswordStrength'

const route = useRoute()

// State
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
const isSuccess = ref(false)
const userInfo = ref<any>(null)
const tenantSlug = ref('')

// Unified password policy: length ≥ 12 + zxcvbn strength + HIBP breach check.
const {
  zxcvbnScore,
  hibpStatus,
  hibpCount,
  strengthLabel,
  evaluate: evaluatePassword,
  isPasswordAcceptable,
} = usePasswordStrength()

watch(password, (pw) => { evaluatePassword(pw) })

const passwordsMatch = computed(() => password.value === confirmPassword.value && password.value.length > 0)

const isValidPassword = computed(() =>
  isPasswordAcceptable(password.value) && passwordsMatch.value
)

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  password.value = pw
  confirmPassword.value = pw
  showPassword.value = true
  evaluatePassword(pw)
}

// Methods
const setPassword = async () => {
  if (!isValidPassword.value) {
    error.value = 'Bitte erfüllen Sie alle Passwort-Anforderungen'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    // Update password using the token from URL
    const { error: updateError } = await $fetch('/api/auth/manage', { 
      method: 'POST', 
      body: { 
        action: 'update-user', 
        attributes: {
          password: password.value
        }
      }
    })

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Create business user record via secure API
    const user = authStore.user
    if (user && userInfo.value) {
      try {
        await $fetch('/api/auth/complete-registration', {
          method: 'POST',
          body: {
            first_name: userInfo.value.first_name,
            last_name: userInfo.value.last_name,
            phone: userInfo.value.phone || null,
            role: userInfo.value.role,
            tenant_id: userInfo.value.tenant_id
          }
        })
      } catch (registrationError: any) {
        console.warn('Warning completing registration:', registrationError.message)
        // Don't fail the whole process if business user creation fails
      }
    }

    isSuccess.value = true
    logger.debug('✅ Password set successfully')

  } catch (err: any) {
    console.error('❌ Error setting password:', err)
    error.value = err.message || 'Fehler beim Festlegen des Passworts'
  } finally {
    isLoading.value = false
  }
}

// Load user info from invitation token
onMounted(async () => {
  try {
    // Get user info from auth session
    const { data: { user }, error } = authStore.user // ✅ MIGRATED
    
    if (error || !user) {
      error.value = 'Ungültiger Einladungslink'
      return
    }

    // Extract user info from metadata
    userInfo.value = {
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name,
      email: user.email,
      role: user.user_metadata?.role,
      tenant_id: user.user_metadata?.tenant_id
    }

    // Get tenant slug for redirect via public branding API
    if (userInfo.value.tenant_id) {
      try {
        const brandingData = await $fetch(`/api/tenants/branding?tenantId=${userInfo.value.tenant_id}`) as any
        tenantSlug.value = brandingData?.tenant?.slug || 'default'
      } catch {
        tenantSlug.value = 'default'
      }
    }

    logger.debug('👤 User info loaded from invitation:', userInfo.value)

  } catch (err) {
    console.error('❌ Error loading invitation:', err)
    error.value = 'Fehler beim Laden der Einladung'
  }
})
</script>

<style scoped>
.transition-colors {
  transition: all 0.2s ease-in-out;
}

input:focus {
  outline: none;
}

/* Password strength indicators */
.text-green-600 {
  color: #059669;
}
</style>
