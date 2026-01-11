<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4" :style="{ background: 'linear-gradient(to bottom right, #7C3AED15, #64748b15)' }">
    
    <!-- Simy Logo (Oben in der Mitte) -->
    <div class="mb-8">
      <img src="/simy-logo.png" alt="Simy" class="h-12">
    </div>
    
    <!-- Login Form -->
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header mit Simy-Branding -->
      <div class="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          
          <h1 class="text-2xl font-bold">Willkommen bei Simy</h1>
          <p class="text-white text-opacity-90 mt-1">
            Melden Sie sich in Ihrem Account an
          </p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="p-6">
        <!-- Session Check Loading -->
        <div v-if="isCheckingSession" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style="border-bottom-color: #7C3AED;"></div>
          <p class="text-gray-600">Überprüfe Session...</p>
        </div>

        <!-- Login Form / MFA Form -->
        <form v-if="!mfaFlow.state.value.requiresMFA" @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              v-model="loginForm.email"
              type="email"
              autocomplete="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
              placeholder="ihre@email.com"
              :disabled="isLoading"
            >
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                :style="{ '--tw-ring-color': '#7C3AED' }"
                placeholder="Ihr Passwort"
                :disabled="isLoading"
              >
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                :disabled="isLoading"
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
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                v-model="loginForm.rememberMe"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                :disabled="isLoading"
              >
              <span class="ml-2 text-sm text-gray-600">Angemeldet bleiben</span>
            </label>
            
            <button
              type="button"
              @click="() => { logger.debug('Button clicked'); showForgotPasswordModal = true; logger.debug('Modal set to:', showForgotPasswordModal); }"
              class="text-sm text-violet-600 hover:underline hover:text-violet-800 cursor-pointer"
            >
              Passwort vergessen?
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="loginError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ loginError }}</p>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading || rateLimitCountdown > 0"
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ 
              background: '#7C3AED',
              '--hover-color': '#7C3AED' + 'dd'
            }"
            @mouseenter="($event.target as HTMLElement).style.opacity = '0.9'"
            @mouseleave="($event.target as HTMLElement).style.opacity = '1'"
          >
            <span v-if="rateLimitCountdown > 0">
              Bitte warten Sie {{ rateLimitCountdown }}s...
            </span>
            <span v-else-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>
        </form>


        <!-- MFA Verification Form -->
        <div v-else-if="mfaFlow.state.value.requiresMFA" class="space-y-4">
          <!-- MFA Header -->
          <div class="text-center mb-6">
            <h2 class="text-xl font-bold text-gray-900">
              Multi-Faktor-Authentifizierung
            </h2>
            <p class="text-sm text-gray-600 mt-2">
              Wählen Sie eine Verifizierungsmethode
            </p>
          </div>

          <!-- MFA-Methoden Auswahl -->
          <div v-if="mfaFlow.state.value.availableOptions.length > 0" class="space-y-2">
            <p class="text-sm font-medium text-gray-700">Authentifizierungsmethode:</p>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="method in mfaFlow.state.value.availableOptions"
                :key="method.id"
                type="button"
                @click="mfaFlow.selectMFAMethod(method.id)"
                :class="{
                  'ring-2': mfaFlow.state.value.selectedOption?.id === method.id,
                  'ring-offset-0': mfaFlow.state.value.selectedOption?.id === method.id
                }"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors hover:border-gray-400"
                :style="{
                  background: mfaFlow.state.value.selectedOption?.id === method.id 
                    ? '#7C3AED10' 
                    : 'white',
                  color: mfaFlow.state.value.selectedOption?.id === method.id
                    ? '#7C3AED'
                    : '#374151',
                  borderColor: mfaFlow.state.value.selectedOption?.id === method.id
                    ? '#7C3AED'
                    : '#d1d5db'
                }"
              >
                {{ method.name }}
              </button>
            </div>
          </div>

          <!-- Code Input -->
          <div>
            <label for="mfa-code" class="block text-sm font-medium text-gray-700 mb-2">
              Bestätigungscode
            </label>
            <input
              id="mfa-code"
              :value="mfaFlow.state.value.code"
              @input="mfaFlow.updateCode(($event.target as HTMLInputElement).value)"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              class="w-full px-4 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
            >
            <p class="text-xs text-gray-500 mt-1 text-center">
              Code an {{ mfaFlow.state.value.email }}
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="mfaFlow.state.value.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ mfaFlow.state.value.error }}</p>
            <p v-if="mfaFlow.state.value.remainingAttempts > 0 && mfaFlow.state.value.remainingAttempts < 3" class="text-xs text-red-600 mt-1">
              Noch {{ mfaFlow.state.value.remainingAttempts }} Versuche
            </p>
            <p v-if="mfaFlow.state.value.remainingAttempts === 0" class="text-xs text-red-600 mt-2">
              Passwort vergessen? Bitte benutzen Sie die Passwort zurücksetzen Funktion unten.
            </p>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <!-- Code versenden -->
            <button
              type="button"
              @click="mfaFlow.sendMFACode()"
              :disabled="mfaFlow.state.value.isVerifying"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="mfaFlow.state.value.isVerifying">Wird versendet...</span>
              <span v-else>Erneut versenden</span>
            </button>

            <!-- Verifizieren -->
            <button
              type="button"
              @click="handleMFAVerify()"
              :disabled="!mfaFlow.canSubmitCode.value"
              class="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :style="{ background: '#7C3AED' }"
            >
              <span v-if="mfaFlow.state.value.isVerifying">Wird überprüft...</span>
              <span v-else>Verifizieren</span>
            </button>
          </div>

          <!-- Zurück Button -->
          <button
            type="button"
            @click="mfaFlow.resetMFAState()"
            class="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Zurück
          </button>
        </div>

        <!-- Footer Links -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Noch kein Account? 
            <NuxtLink :to="'/register'" class="font-medium hover:underline" style="color: #7C3AED;">
              Registrieren
            </NuxtLink>
          </p>
          
          <div class="mt-4 pt-4 border-t border-gray-200">
            <NuxtLink to="/" class="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Zurück zur Startseite
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Passwort Vergessen Modal -->
    <div v-if="showForgotPasswordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div class="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-t-xl">
          <h2 class="text-2xl font-bold">Passwort zurücksetzen</h2>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <p class="text-gray-600 text-sm">
            Geben Sie Ihre E-Mail-Adresse oder Telefonnummer ein, und wir senden Ihnen einen Magic Link zum Zurücksetzen Ihres Passworts.
          </p>

          <!-- Contact Method Selector -->
          <div class="flex gap-2">
            <button
              @click="resetContactMethod = 'email'"
              :class="[
                'flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm',
                resetContactMethod === 'email'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              :style="resetContactMethod === 'email' ? { background: '#7C3AED' } : {}"
            >
              E-Mail
            </button>
            <button
              @click="resetContactMethod = 'phone'"
              :class="[
                'flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm',
                resetContactMethod === 'phone'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              :style="resetContactMethod === 'phone' ? { background: '#7C3AED' } : {}"
            >
              Telefon
            </button>
          </div>

          <!-- Email Input -->
          <div v-if="resetContactMethod === 'email'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              v-model="resetForm.email"
              type="email"
              placeholder="ihre@email.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
              :disabled="resetIsLoading"
            >
          </div>

          <!-- Phone Input -->
          <div v-if="resetContactMethod === 'phone'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Telefonnummer
            </label>
            <input
              v-model="resetForm.phone"
              type="tel"
              placeholder="+41 79 123 45 67"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--tw-ring-color': '#7C3AED' }"
              :disabled="resetIsLoading"
            >
          </div>

          <!-- Error Message -->
          <div v-if="resetError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ resetError }}</p>
          </div>

          <!-- Success Message -->
          <div v-if="resetSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-700">{{ resetSuccess }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              @click="showForgotPasswordModal = false"
              class="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              :disabled="resetIsLoading"
            >
              Abbrechen
            </button>
            <button
              @click="handlePasswordReset"
              class="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
              :style="{ background: '#7C3AED' }"
              :disabled="resetIsLoading"
            >
              <span v-if="resetIsLoading">Wird gesendet...</span>
              <span v-else>Magic Link senden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, definePageMeta, useHead, useRoute, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useTenant } from '~/composables/useTenant'
import { useMFAFlow } from '~/composables/useMFAFlow'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

// Meta
definePageMeta({
  layout: false
  // No middleware restriction - let it be public
})

// Composables
const router = useRouter()
const route = useRoute()
const { login, logout, isLoggedIn, loading } = useAuthStore()
const { showError, showSuccess } = useUIStore()
const { loadTenant, currentTenant } = useTenant()
const mfaFlow = useMFAFlow()
const supabase = getSupabase()

// Get tenant from URL parameter or route params
const tenantParam = ref(
  (route.params.tenant as string) || 
  (route.query.tenant as string) || 
  ''
)

// Watch for tenant changes and load tenant
watch(
  () => [route.params.tenant, route.query.tenant],
  ([paramTenant, queryTenant]) => {
    const newTenant = (paramTenant as string) || (queryTenant as string)
    if (newTenant && newTenant !== tenantParam.value) {
      tenantParam.value = newTenant
      logger.debug('🏢 Tenant updated from URL:', tenantParam.value)
      loadTenant(tenantParam.value)
    }
  },
  { immediate: true }
)

// Computed
const isCheckingSession = computed<boolean>(() => Boolean((loading as any).value ?? loading))
const isAuthenticated = computed<boolean>(() => Boolean((isLoggedIn as any).value ?? isLoggedIn))

// State
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showPassword = ref(false)
const showForgotPasswordModal = ref(false)
const rateLimitCountdown = ref<number>(0)
const rateLimitInterval = ref<NodeJS.Timeout | null>(null)

// Password Reset State
const resetContactMethod = ref<'email' | 'phone'>('email')
const resetIsLoading = ref(false)
const resetError = ref<string | null>(null)
const resetSuccess = ref<string | null>(null)

const resetForm = ref({
  email: '',
  phone: ''
})

const loginForm = ref({
  email: '',
  password: '',
  rememberMe: false
})


// Methods
const handleLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Bitte füllen Sie alle Felder aus.'
    return
  }

  isLoading.value = true
  loginError.value = null

  try {
    logger.debug('🔑 Starting login attempt for:', loginForm.value.email)
    
    // Versuche zu authentifizieren über den neuen Login-Endpoint mit MFA-Support
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: loginForm.value.email.toLowerCase().trim(),
        password: loginForm.value.password,
        tenantId: currentTenant.value?.id || null
      }
    }) as any

    logger.debug('📋 Login response:', { requiresMFA: response?.requiresMFA, success: response?.success })

    // ✨ MFA erforderlich?
    if (response?.requiresMFA) {
      logger.debug('🔐 MFA erforderlich für:', response.email)
      await mfaFlow.handleMFARequired(response.email)
      return // MFA-Screen wird jetzt angezeigt
    }

    // Fehler beim Login?
    if (!response?.success || response?.requiresMFA) {
      const errorMsg = response?.statusMessage || 'Anmeldung fehlgeschlagen'
      
      if (errorMsg?.includes('Invalid login credentials')) {
        loginError.value = 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.'
      } else if (errorMsg?.includes('Account')) {
        loginError.value = errorMsg
      } else if (errorMsg?.includes('too many') || errorMsg?.includes('429')) {
        loginError.value = 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.'
      } else {
        loginError.value = errorMsg || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      }
      return
    }

    // Normales Login erfolgreich
    logger.debug('✅ Login successful')
    
    // Setze die Supabase Session manuell mit den Tokens vom Server
    const supabase = getSupabase()
    if (response.session) {
      logger.debug('🔐 Setting Supabase session with tokens from server')
      
      // Speichere Tokens direkt in localStorage (Supabase wird diese automatisch laden)
      if (typeof window !== 'undefined') {
        try {
          // Supabase speichert Session unter diesem Key
          const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
          const projectId = supabaseUrl.split('.')[0].split('//')[1]
          const key = `sb-${projectId}-auth-token`
          
          const sessionData = {
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
            expires_in: response.session.expires_in,
            expires_at: response.session.expires_at,
            token_type: 'bearer',
            type: 'signup'
          }
          
          localStorage.setItem(key, JSON.stringify(sessionData))
          logger.debug('✅ Session stored in localStorage with key:', key)
          logger.debug('🔍 Session data stored:', {
            hasAccessToken: !!response.session.access_token,
            hasRefreshToken: !!response.session.refresh_token
          })
        } catch (err) {
          logger.debug('⚠️ Failed to store session in localStorage:', err)
        }
      }
      
      // Versuche auch setSession zu verwenden
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token
        })
        if (error) {
          logger.debug('⚠️ setSession returned error:', error.message)
        } else {
          logger.debug('✅ setSession succeeded')
        }
      } catch (err) {
        logger.debug('⚠️ setSession threw error (but localStorage is set):', err)
      }
    }
    
    // Speichere Session und User
    const authStore = useAuthStore()
    authStore.user = response.user
    
    // Warte kurz für Auth-State Update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Lade User-Profil
    await authStore.fetchUserProfile(response.user.id)
    
    const user = authStore.userProfile
    
    if (!user) {
      console.error('❌ User profile not loaded after login!')
      loginError.value = 'Fehler beim Laden des Benutzerprofils. Bitte erneut einloggen.'
      await authStore.logout()
      return
    }
    
    logger.debug('✅ User profile loaded:', user.email)

    // Lade Tenant-Informationen
    let redirectPath = '/dashboard' // Fallback
    
    // Master Admin geht direkt zu /tenant-admin
    if (user.role === 'super_admin') {
      logger.debug('👑 Master Admin detected, redirecting to /tenant-admin')
      redirectPath = '/tenant-admin'
    } else if (user.tenant_id) {
      logger.debug('🏢 Loading tenant info for tenant_id:', user.tenant_id)
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', user.tenant_id)
        .single()
      
      if (tenantError) {
        console.error('❌ Error loading tenant:', tenantError)
      } else if (tenant?.slug) {
        logger.debug('✅ Found tenant slug:', tenant.slug)
        
        // Weiterleitung basierend auf Rolle
        if (user.role === 'admin' || user.role === 'tenant_admin') {
          redirectPath = '/admin'
        } else if (user.role === 'staff') {
          redirectPath = '/dashboard'
        } else {
          redirectPath = '/customer-dashboard'
        }
      }
    }
    
    showSuccess('Erfolgreich angemeldet', 'Willkommen zurück!')
    logger.debug('🔄 Redirecting to:', redirectPath)
    router.push(redirectPath)
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    // Get the status message from multiple possible paths
    const errorMsg = error?.data?.statusMessage || 
                     error?.cause?.statusMessage ||
                     error?.message || 
                     'Anmeldung fehlgeschlagen'
    
    // Check for rate limit error and start countdown - use toLowerCase() for case-insensitive matching
    const isRateLimitError = errorMsg?.toLowerCase().includes('too many') || 
                             errorMsg?.includes('429') || 
                             errorMsg?.toLowerCase().includes('zu viele')
    
    if (isRateLimitError) {
      loginError.value = 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in einigen Minuten erneut.'
      
      // Get retry-after time from MULTIPLE possible paths
      let retryAfter = 60000 // fallback to 60 seconds
      
      // Try all possible paths - order matters! Most nested first
      if (error?.cause?.data?.retryAfter !== undefined) {
        retryAfter = error.cause.data.retryAfter
      } else if (error?.data?.data?.retryAfter !== undefined) {
        retryAfter = error.data.data.retryAfter
      } else if (error?.data?.retryAfter !== undefined) {
        retryAfter = error.data.retryAfter
      }
      
      const countdown = Math.ceil(retryAfter / 1000) // convert to seconds
      rateLimitCountdown.value = Math.max(1, countdown) // minimum 1 second
      console.log('Rate limit countdown set to:', rateLimitCountdown.value, 'seconds')
      
      // Start countdown timer
      if (rateLimitInterval.value) clearInterval(rateLimitInterval.value)
      rateLimitInterval.value = setInterval(() => {
        rateLimitCountdown.value--
        if (rateLimitCountdown.value <= 0) {
          if (rateLimitInterval.value) clearInterval(rateLimitInterval.value)
          rateLimitCountdown.value = 0
        }
      }, 1000)
    } else if (errorMsg?.includes('Invalid login credentials')) {
      loginError.value = 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.'
    } else if (errorMsg?.includes('Account')) {
      loginError.value = errorMsg
    } else if (errorMsg?.includes('Email not confirmed')) {
      loginError.value = 'Bitte bestätigen Sie Ihre E-Mail-Adresse zuerst.'
    } else if (errorMsg?.includes('User not found')) {
      loginError.value = 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.'
    } else if (errorMsg?.includes('disabled')) {
      loginError.value = 'Ihr Account wurde deaktiviert. Bitte kontaktieren Sie den Administrator.'
    } else if (errorMsg?.includes('network') || errorMsg?.includes('timeout')) {
      loginError.value = 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
    } else {
      loginError.value = errorMsg
    }
  } finally {
    isLoading.value = false
  }
}

const handleMFAVerify = async () => {
  const result = await mfaFlow.verifyMFACode(loginForm.value.password)
  
  if (result && result.success) {
    logger.debug('✅ MFA verification successful, logging in...')
    
    // MFA erfolgreich - führe normales Login-Ende aus
    const authStore = useAuthStore()
    authStore.user = result.user
    
    await new Promise(resolve => setTimeout(resolve, 200))
    await authStore.fetchUserProfile(result.user.id)
    
    const user = authStore.userProfile
    
    if (!user) {
      loginError.value = 'Fehler beim Laden des Benutzerprofils.'
      return
    }
    
    let redirectPath = '/dashboard'
    
    // Master Admin geht direkt zu /tenant-admin
    if (user.role === 'super_admin') {
      logger.debug('👑 Master Admin detected, redirecting to /tenant-admin')
      redirectPath = '/tenant-admin'
    } else if (user.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', user.tenant_id)
        .single()
      
      if (tenant?.slug) {
        if (user.role === 'admin' || user.role === 'tenant_admin') {
          redirectPath = '/admin'
        } else if (user.role === 'staff') {
          redirectPath = '/dashboard'
        } else {
          redirectPath = '/customer-dashboard'
        }
      }
    }
    
    showSuccess('Erfolgreich angemeldet', 'Willkommen zurück!')
    logger.debug('🔄 Redirecting to:', redirectPath)
    router.push(redirectPath)
  }
}

const handlePasswordReset = async () => {
  resetError.value = null
  resetSuccess.value = null

  let contact = resetContactMethod.value === 'email' ? resetForm.value.email : resetForm.value.phone

  if (!contact) {
    resetError.value = resetContactMethod.value === 'email' 
      ? 'Bitte geben Sie eine E-Mail-Adresse ein.' 
      : 'Bitte geben Sie eine Telefonnummer ein.'
    return
  }

  // Format phone number: add +41 if starts with 0
  if (resetContactMethod.value === 'phone') {
    contact = contact.replace(/\s/g, '') // Remove spaces
    if (contact.startsWith('0')) {
      contact = '+41' + contact.substring(1)
    } else if (!contact.startsWith('+')) {
      contact = '+41' + contact
    }
    logger.debug('📱 Formatted phone number:', contact)
  }

  resetIsLoading.value = true

  try {
    logger.debug('🔐 Requesting password reset for:', contact)
    
    const response = await $fetch('/api/auth/password-reset-request', {
      method: 'POST',
      body: {
        contact,
        method: resetContactMethod.value,
        tenantId: null // We'll determine this from the contact
      }
    }) as any

    logger.debug('📧 Password reset response:', response)

    if (response?.success) {
      // Check if there was a warning (sending failed)
      if (response?.warning) {
        resetError.value = response.message
      } else {
        resetSuccess.value = resetContactMethod.value === 'email'
          ? `Wenn ein Benutzer mit ${contact} vorhanden ist, wird ihm ein Magic Link gesendet. Bitte überprüfen Sie Ihren Posteingang.`
          : `Wenn ein Benutzer mit ${contact} vorhanden ist, wird ihm ein Magic Link gesendet. Bitte überprüfen Sie Ihre SMS.`
        
        resetForm.value.email = ''
        resetForm.value.phone = ''
        
        logger.debug('✅ Password reset email/SMS sent, closing modal in 3 seconds...')
        
        // Schließe Modal nach 3 Sekunden
        setTimeout(() => {
          showForgotPasswordModal.value = false
          resetSuccess.value = null
        }, 3000)
      }
    } else {
      resetError.value = response?.message || 'Fehler beim Senden des Magic Links. Bitte versuchen Sie es später erneut.'
    }
  } catch (error: any) {
    console.error('❌ Password reset error:', error)
    console.error('Error data:', error?.data)
    console.error('Error status:', error?.status)
    console.error('❌ Full error details:', {
      message: error?.message,
      data: error?.data,
      statusMessage: error?.data?.statusMessage,
      statusCode: error?.statusCode
    })
    
    // Show more specific error messages
    const errorMsg = error?.data?.statusMessage || error?.message || 'Fehler beim Senden des Magic Links.'
    if (errorMsg.includes('SMS') || errorMsg.includes('Twilio')) {
      resetError.value = 'SMS konnte nicht gesendet werden. Bitte überprüfen Sie Ihre Telefonnummer oder versuchen Sie es mit E-Mail.'
    } else if (errorMsg.includes('email') || errorMsg.includes('Email')) {
      resetError.value = 'E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
    } else {
      resetError.value = errorMsg
    }
  } finally {
    resetIsLoading.value = false
  }
}

// ======= Face ID Login =======

/**
 * Login with Face ID / WebAuthn
 */

const handleLogout = async () => {
  try {
    await logout()
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    // Zur Login-Seite weiterleiten
    navigateTo('/')
  } catch (error) {
    console.error('Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden.')
  }
}

// Lifecycle
onMounted(async () => {
  // Check WebAuthn support

  // Warte kurz damit Auth-State nach Logout vollständig gelöscht ist
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Prüfe ob bereits angemeldet
  if (isAuthenticated.value && !isLoading.value) {
    logger.debug('🔄 User already authenticated, checking profile...')
    const authStore = useAuthStore()
    
    // Warte kurz auf User-Profil
    let attempts = 0
    while (!authStore.userProfile && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    const user = authStore.userProfile
    
    if (!user) {
      console.error('❌ Session exists but no user profile! Clearing broken session...')
      await logout()
      loginError.value = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
      return
    }
    
    logger.debug('✅ User profile found, redirecting...')
    if (user?.role === 'super_admin') {
      router.push('/tenant-admin')
    } else if (user?.role === 'admin' || user?.role === 'tenant_admin') {
      router.push('/admin')
    } else if (user?.role === 'staff') {
      router.push('/dashboard')
    } else {
      router.push('/customer-dashboard')
    }
  }
})

// SEO
useHead({
  title: 'Anmelden - Simy',
  meta: [
    { name: 'description', content: 'Melden Sie sich in Ihrem Simy Account an.' },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>

<style scoped>
/* Focus styles */
input:focus {
  outline: none;
}

input[type="checkbox"]:checked {
  background-color: #7C3AED;
  border-color: #7C3AED;
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>

