<template>
  <!-- Skip rendering for sub-routes -->
  <div v-if="isSubRoute" class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Lade...</p>
    </div>
  </div>
  
  <!-- Main login form -->
  <div v-else class="min-h-screen flex items-center justify-center p-4" 
       :style="{ 
         background: currentBranding?.colors ? 
           `linear-gradient(to bottom right, ${currentBranding.colors.primary}15, ${currentBranding.colors.secondary}15)` : 
           'linear-gradient(to bottom right, #1E40AF15, #64748B15)' 
       }">
    
    <!-- Loading State -->
    <div v-if="isLoadingBranding" class="text-center">
      <div class="w-16 h-16 mx-auto mb-4 animate-pulse bg-gray-200 rounded-lg"></div>
      <p class="text-gray-600">Lade...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="brandingError" class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
      <div class="text-red-500 mb-4">
        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Firma nicht gefunden</h2>
      <p class="text-gray-600 mb-4">{{ brandingError }}</p>
      <button 
        @click="$router.push('/')" 
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Zurück zur Auswahl
      </button>
    </div>

    <!-- Login Form -->
    <div v-else class="w-full max-w-md">
      <!-- Logo außerhalb - oberhalb des farbigen Bereichs -->
      <div class="text-center mb-6">
        <img 
          v-if="headerLogo" 
          :src="headerLogo" 
          class="h-10 w-auto mx-auto drop-shadow-lg" 
          :alt="`${brandName} Logo`"
        >
        <div 
          v-else 
          class="w-10 h-10 mx-auto bg-white rounded-lg shadow-lg flex items-center justify-center"
        >
          <span class="text-xl font-bold" :style="{ color: primaryColor }">{{ brandName.charAt(0).toUpperCase() }}</span>
        </div>
      </div>
      
      <!-- Card mit farbigem Header -->
      <div class="bg-white rounded-xl shadow-2xl overflow-hidden">
        <!-- Header mit Tenant-Branding (ohne Logo) -->
        <div 
          class="text-white p-6" 
          :style="{ backgroundColor: primaryColor }"
        >
          <div class="text-center">
            <h1 class="text-2xl font-bold">Willkommen</h1>
            <p class="text-white text-opacity-90 mt-1">
              Melden Sie sich in Ihrem {{ brandName }} Account an
            </p>
          </div>
        </div>


      <!-- Login Form -->
      <div class="p-6">
        <!-- Session Check Loading -->
        <div v-if="isCheckingSession" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" :style="{ borderColor: primaryColor }"></div>
          <p class="text-gray-600">Überprüfe Session...</p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              v-model="loginForm.email"
              type="email"
              class="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
              :class="[
                emailError ? 'border-2 border-red-500' : 'border border-gray-300'
              ]"
              :style="{ '--focus-color': emailError ? '#ef4444' : primaryColor }"
              placeholder="ihre@email.com"
              :disabled="isLoading"
            >
            <p v-if="emailError" class="text-sm text-red-600 mt-1">{{ emailError }}</p>
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
                class="w-full px-3 py-2 pr-10 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                :class="[
                  passwordError ? 'border-2 border-red-500' : 'border border-gray-300'
                ]"
                :style="{ '--focus-color': passwordError ? '#ef4444' : primaryColor }"
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
            <p v-if="passwordError" class="text-sm text-red-600 mt-1">{{ passwordError }}</p>
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                v-model="loginForm.rememberMe"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-2"
                :style="{ '--focus-color': primaryColor }"
                :disabled="isLoading"
              >
              <span class="ml-2 text-sm text-gray-600">Angemeldet bleiben</span>
            </label>
            
            <button
              type="button"
              @click="showForgotPasswordModal = true"
              class="text-sm hover:underline"
              :style="{ color: primaryColor }"
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
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            :style="{ backgroundColor: primaryColor }"
          >
            <span v-if="rateLimitCountdown > 0">
              Bitte warten Sie {{ rateLimitCountdown }}s...
            </span>
            <span v-else-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>
        </form>


        <!-- MFA Verification Form -->
        <div v-if="mfaFlow.state.value.requiresMFA" class="space-y-4">
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
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors hover:border-gray-400"
                :style="{
                  background: mfaFlow.state.value.selectedOption?.id === method.id 
                    ? primaryColor + '10' 
                    : 'white',
                  color: mfaFlow.state.value.selectedOption?.id === method.id
                    ? primaryColor
                    : '#374151',
                  borderColor: mfaFlow.state.value.selectedOption?.id === method.id
                    ? primaryColor
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
              :style="{ '--tw-ring-color': primaryColor }"
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
              :style="{ background: primaryColor }"
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
            <NuxtLink :to="`/services/${tenantSlug}`" class="font-medium hover:underline" :style="{ color: primaryColor }">
              Registrieren
            </NuxtLink>
          </p>
          
          <div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <button 
              v-if="isAuthenticated"
              @click="handleLogout" 
              class="block w-full text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Aktuellen Account abmelden
            </button>
          </div>
        </div>
      </div>
      <!-- Ende Card -->
      </div>
    </div>

    <!-- Passwort Vergessen Modal -->
    <div v-if="showForgotPasswordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <!-- Header -->
        <div :style="{ background: primaryColor }" class="text-white p-6 rounded-t-xl">
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
              :style="resetContactMethod === 'email' ? { background: primaryColor } : {}"
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
              :style="resetContactMethod === 'phone' ? { background: primaryColor } : {}"
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
              :style="{ '--tw-ring-color': primaryColor }"
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
              :style="{ '--tw-ring-color': primaryColor }"
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
              :style="{ background: primaryColor }"
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

logger.debug('📄 [slug].vue script setup initializing...')

import { ref, computed, onMounted, watch } from 'vue'
import { logger } from '~/utils/logger'
import { useRoute, useRouter, definePageMeta, useHead } from '#imports'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useTenant } from '~/composables/useTenant'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useMFAFlow } from '~/composables/useMFAFlow'

logger.debug('📄 [slug].vue imports completed')

// Types
interface User {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  tenant_id: string | null
  is_active: boolean
  preferred_payment_method?: string
  auth_user_id?: string
}

interface DeviceSecurityResponse {
  success: boolean
  message?: string
  data?: any
  deviceExists?: boolean
  device?: {
    id: string
    is_trusted: boolean
    verified_at?: string | null
    device_name?: string
  }
  error?: string
}

interface VerificationResponse {
  success: boolean
  message?: string
  verificationLink?: string
  expiresAt?: string
  error?: string
  emailError?: string
}

// Reserved routes that should not be caught by the slug route
const reservedRoutes = [
  'admin', 'dashboard', 'customer-dashboard', 'register', 
  'tenant-register', 'auswahl', 'customer', 'courses', 'booking', 
  'payment', 'shop', 'upgrade', 'staff', 'tenant-admin', 'anonymous-sale',
  'reset-password', 'register-staff', 'mock-payment-page', 'pricing-test',
  'simple-test', 'sms-test', 'sms-direct-test', 'wallee-test', 'debug-pricing',
  'debug-other-events', 'optimized-workflow-test', 'accounto-test', 
  'tenant-test', 'tenant-demo', 'tenant-debug', 'tenant-start', 'customers',
  'AdminEventTypes', 'wallee-corrected-test'
  // NOTE: 'login' is intentionally NOT in this list - it should be handled by [slug].vue or /login/[tenant].vue
]

// Meta
definePageMeta({
  layout: false,
  // No middleware restriction - let it be public
  validate: async (route: any) => {
    const slug = route.params.slug as string
    
    // If it's a reserved route, let Nuxt's normal routing handle it
    if (reservedRoutes.includes(slug)) {
      return false
    }
    
    return true
  }
})

// Composables
const route = useRoute()
const router = useRouter()
const { 
  currentTenantBranding,
  isLoading: isLoadingBranding,
  error: brandingError,
  loadTenantBranding,
  brandName,
  primaryColor,
  getLogo
} = useTenantBranding()

const authStore = useAuthStore()
const { login, logout, isLoggedIn, loading } = authStore
const { showError, showSuccess } = useUIStore()
const { currentTenant, loadTenant: loadTenantComposable } = useTenant()
const mfaFlow = useMFAFlow()


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
    
    // ✅ SECURE: Call login API directly with tenantId (same as /login page)
    // Backend will validate that user belongs to this tenant
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: loginForm.value.email.toLowerCase().trim(),
        password: loginForm.value.password,
        tenantId: currentTenant.value?.id,  // ← Backend validates tenant membership
        rememberMe: loginForm.value.rememberMe
      }
    }) as any

    logger.debug('📋 Login response:', { requiresMFA: response?.requiresMFA, success: response?.success })

    // Check if MFA is required
    if (response?.requiresMFA) {
      logger.debug('🔐 MFA required for:', response.email)
      await mfaFlow.handleMFARequired(response.email)
      return // MFA-Screen wird jetzt angezeigt
    }

    // Check if login failed
    if (!response?.success) {
      const errorMsg = response?.statusMessage || 'Anmeldung fehlgeschlagen'
      logger.debug('❌ Login failed:', errorMsg)
      loginError.value = errorMsg
      return
    }

    logger.debug('✅ Login successful')

    // 💾 WICHTIG: Speichere Supabase Session für Token Refresh Interceptor
    if (response?.session?.access_token && response?.session?.refresh_token) {
      try {
        if (typeof localStorage !== 'undefined') {
          const sessionData = {
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
            timestamp: Date.now()
          }
          localStorage.setItem('supabase-session-cache', JSON.stringify(sessionData))
          logger.debug('💾 Supabase session saved to localStorage')
        }
      } catch (err) {
        logger.warn('⚠️ Failed to save session to localStorage:', err)
      }
    }

    // Session tokens are now in HTTP-Only cookies (set by backend)
    // No need to call setSession - cookies are automatically sent with requests

    // Store user in auth store
    authStore.user = response.user

    // Use profile from login response (if available) or fetch via API
    if (response.profile) {
      authStore.userProfile = response.profile
      authStore.userRole = response.profile.role || ''
      logger.debug('✅ User profile from login response:', response.profile.email)
    } else {
      // Fallback: fetch profile via API
      await authStore.fetchUserProfile(response.user.id)
    }

    const user = authStore.userProfile

    if (!user) {
      console.error('❌ User profile not loaded after login!')
      loginError.value = 'Fehler beim Laden des Benutzerprofils. Bitte erneut einloggen.'
      await logout()
      return
    }

    logger.debug('✅ User profile loaded:', user.email)

    // Save tenant slug for next session
    try {
      localStorage.setItem('last_tenant_slug', tenantSlug.value)
      logger.debug('💾 Saved tenant slug to localStorage:', tenantSlug.value)
    } catch (e) {
      logger.warn('⚠️ Could not save tenant slug to localStorage:', e)
    }
    
    // Show success message and redirect
    showSuccess('Erfolgreich angemeldet', `Willkommen bei ${brandName.value}!`)
    
    // Check if there's a redirect parameter first
    const redirectUrl = route.query.redirect as string
    if (redirectUrl) {
      logger.debug('🔄 Redirecting to:', redirectUrl)
      // Remove base URL if present to make it relative
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'
      let relativeUrl = decodeURIComponent(redirectUrl)
      
      // If it's an absolute URL, extract the path
      if (relativeUrl.startsWith(baseUrl)) {
        relativeUrl = relativeUrl.replace(baseUrl, '')
      }
      
      logger.debug('🔄 Relative redirect URL:', relativeUrl)
      router.push(relativeUrl)
      return
    }
    
    // Redirect based on role (fallback)
    if (user?.role === 'admin' || user?.role === 'tenant_admin') {
      router.push('/admin')
    } else if (user?.role === 'staff') {
      router.push('/dashboard')
    } else {
      router.push('/customer-dashboard')
    }
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    const errorMsg = error?.data?.statusMessage || 
                     error?.message || 
                     error?.cause?.statusMessage ||
                     'Anmeldung fehlgeschlagen'
    
    // Check for rate limit error and start countdown
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
      loginError.value = 'Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Passwort.'
    } else {
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}

const handleMFAVerify = async () => {
  const result = await mfaFlow.verifyMFACode(loginForm.value.password)
  
  if (result && result.success) {
    logger.debug('✅ MFA verification successful, logging in...')
    
    // ✅ SAVE: Remember this tenant for next session
    try {
      localStorage.setItem('last_tenant_slug', tenantSlug.value)
      logger.debug('💾 Saved tenant slug to localStorage:', tenantSlug.value)
    } catch (e) {
      logger.warn('⚠️ Could not save tenant slug to localStorage:', e)
    }
    
    // MFA erfolgreich - führe normales Login-Ende aus
    authStore.user = result.user
    
    await new Promise(resolve => setTimeout(resolve, 200))
    await authStore.fetchUserProfile(result.user.id)
    
    const user = authStore.userProfile
    
    if (!user) {
      loginError.value = 'Fehler beim Laden des Benutzerprofils.'
      return
    }
    
    let redirectPath = '/dashboard'
    
    if (user.tenant_id) {
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
    
    showSuccess('Erfolgreich angemeldet', `Willkommen bei ${brandName.value}!`)
    logger.debug('🔄 Redirecting to:', redirectPath)
    router.push(redirectPath)
  }
}

const handleLogout = async () => {
  try {
    await logout()
    
    // ✅ KEEP: Don't clear last_tenant_slug on logout - so user can login again to same tenant
    // localStorage.setItem('last_tenant_slug', '') // Keep it for next login
    
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    // Zur tenant-spezifischen Login-Seite weiterleiten
    // Use tenantSlug from route instead of currentTenant (which might be cleared)
    const slug = route.params.slug
    if (slug) {
      router.push(`/${slug}`)
    } else if (currentTenant.value?.slug) {
      router.push(`/${currentTenant.value.slug}`)
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error('Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden.')
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
        tenantId: null
      }
    }) as any

    logger.debug('📧 Password reset response:', response)

    if (response?.success) {
      // Check if there was a warning (sending failed)
      if (response?.warning) {
        resetError.value = response.message
      } else {
        resetSuccess.value = resetContactMethod.value === 'email'
          ? `Ein Magic Link wurde an ${contact} gesendet. Bitte überprüfen Sie Ihren Posteingang.`
          : `Ein Magic Link wurde an ${contact} gesendet. Bitte überprüfen Sie Ihre SMS.`
        
        resetForm.value.email = ''
        resetForm.value.phone = ''
        
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

// Device fingerprinting functions
// ✅ VERBESSERT: Nur stabile Eigenschaften verwenden (ohne Canvas, der sich ändern kann)
const generateDeviceFingerprint = async (): Promise<string | null> => {
  if (!process.client) return null
  
  try {
    // ✅ NUR STABILE EIGENSCHAFTEN: Diese ändern sich nicht bei Browser-Updates
    const fingerprint = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      // ✅ ENTFERNT: canvas, language, timezone, doNotTrack - diese können sich ändern
    }
    
    // Create a hash-like identifier from the fingerprint
    const fingerprintString = JSON.stringify(fingerprint)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString))
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    logger.debug('🔐 Generated device fingerprint:', {
      hash: hashHex.substring(0, 16),
      components: fingerprint
    })
    
    return hashHex.substring(0, 16) // Ensure it fits in VARCHAR(17)
  } catch (error) {
    console.error('Error generating device fingerprint:', error)
    return null
  }
}

const getDeviceName = (userAgent: string): string => {
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'Mobile Device'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return 'Tablet'
  } else if (userAgent.includes('Chrome')) {
    return 'Chrome Browser'
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox Browser'
  } else if (userAgent.includes('Safari')) {
    return 'Safari Browser'
  } else if (userAgent.includes('Edge')) {
    return 'Edge Browser'
  } else {
    return 'Unknown Browser'
  }
}

// State für Session-Check
const isCheckingSession = ref(true) // Start mit true, wird nach Prüfung auf false gesetzt

// Computed
const isAuthenticated = computed<boolean>(() => Boolean((isLoggedIn as any).value ?? isLoggedIn))

// State
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showPassword = ref(false)
const rateLimitCountdown = ref<number>(0)
const rateLimitInterval = ref<NodeJS.Timeout | null>(null)

// Password Reset State
const showForgotPasswordModal = ref(false)
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

// Inline validation errors
const emailError = ref<string | null>(null)
const passwordError = ref<string | null>(null)

// Validate email in real-time
watch(() => loginForm.value.email, (newEmail) => {
  if (!newEmail) {
    emailError.value = null
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail.trim())) {
    emailError.value = 'Ungültige E-Mail-Adresse'
  } else {
    emailError.value = null
  }
})

// Validate password (accept any length on login)
watch(() => loginForm.value.password, (newPassword) => {
  // No validation on login - accept any password length
  // (users have different password requirements from different registration times)
  passwordError.value = null
})

// Computed
const tenantSlug = computed(() => route.params.slug as string)
const currentBranding = computed(() => currentTenantBranding.value)
const headerLogo = computed(() => getLogo('header'))

// Check if this is a sub-route that should be handled by other pages
const isSubRoute = computed(() => {
  const currentPath = route.path
  return currentPath.includes('/services') || currentPath.includes('/register')
})

// Check if this is specifically a register route
const isRegisterRoute = computed(() => {
  const currentPath = route.path
  return currentPath.includes('/register')
})



// Lifecycle
onMounted(async () => {
  // Skip für bestimmte Unterpfade (services, register)
  const currentPath = route.path
  if (currentPath.includes('/services') || currentPath.includes('/register')) {
    logger.debug('🔓 Skipping login page for sub-route:', currentPath)
    return
  }
  
  // Lade Tenant-Branding
  try {
    await loadTenantBranding(tenantSlug.value)
    if (!currentTenantBranding.value && brandingError.value) {
      // Unbekannter Slug -> zurück zur Auswahl
      router.push('/')
      return
    }
  } catch (error) {
    console.error('Failed to load tenant branding:', error)
  }
  
  // Load currentTenant from URL slug so it's available for login
  try {
    await loadTenantComposable(tenantSlug.value)
    logger.debug('✅ Loaded currentTenant from URL slug:', tenantSlug.value)
  } catch (err: any) {
    logger.debug('⚠️ Failed to load currentTenant:', err.message)
    // Continue anyway - login will fail with proper error message
  }
  
  // ✅ PRÜFUNG: Session-Check mit Timeout - verhindert hängen bleiben
  try {
    // Setze Timeout für Session-Check (max 2 Sekunden)
    const sessionCheckTimeout = setTimeout(() => {
      logger.debug('⏱️ Session check timeout - showing login form')
      isCheckingSession.value = false
    }, 2000)
    
    // Use /api/auth/current-user which reads httpOnly cookies automatically
    const currentUserResponse = await $fetch('/api/auth/current-user').catch(() => null)
    const sessionUser = currentUserResponse?.user
    const session = sessionUser ? { user: sessionUser } : null
    clearTimeout(sessionCheckTimeout)
    
    if (!session) {
      logger.debug('✅ No session found - user is logged out, showing login form')
      isCheckingSession.value = false
      return
    }
    
    // Session existiert - prüfe ob User authentifiziert ist
    logger.debug('✅ Session found, checking authentication status')
    
    // Warte kurz auf Auth-Store Initialisierung
    let attempts = 0
    while ((loading as any).value && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    isCheckingSession.value = false
    
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
        isCheckingSession.value = false
        return
      }
      
      logger.debug('✅ User profile found, redirecting...')
      if (user?.role === 'admin' || user?.role === 'tenant_admin') {
        router.push('/admin')
      } else if (user?.role === 'staff') {
        router.push('/dashboard')
      } else {
        router.push('/customer-dashboard')
      }
    }
  } catch (sessionError) {
    logger.debug('✅ Session check failed (user logged out):', sessionError)
    isCheckingSession.value = false
    // Session-Check ist abgeschlossen - Login-Formular anzeigen
  }
})

// SEO
useHead(() => ({
  title: `Anmelden - ${brandName.value}`,
  meta: [
    { name: 'description', content: `Melden Sie sich in Ihrem ${brandName.value} Account an.` },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
}))
</script>

<style scoped>
/* Focus styles mit dynamischen Farben */
input:focus {
  outline: none;
  border-color: var(--focus-color, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus-color, #3b82f6) 20%, transparent);
}

input[type="checkbox"]:checked {
  background-color: var(--focus-color, #3b82f6);
  border-color: var(--focus-color, #3b82f6);
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

/* Pulse animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

