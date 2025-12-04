<template>
  <div class="min-h-screen flex items-center justify-center p-4" :style="{ background: `linear-gradient(to bottom right, ${(currentTenant?.primary_color || '#2563eb')}15, #64748b15)` }">
    
    <!-- Login Form -->
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header mit Tenant-Branding -->
      <div :style="{ background: currentTenant?.primary_color || '#2563eb' }" class="text-white p-6 rounded-t-xl">
        <div class="text-center">
          <!-- Tenant Logo -->
          <div v-if="currentTenant?.logo_url" class="mb-4">
            <img :src="currentTenant.logo_url" :alt="currentTenant.name" class="w-12 h-12 mx-auto">
          </div>
          <div v-else class="mb-4">
            <div class="w-12 h-12 mx-auto bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span class="text-2xl font-bold">{{ currentTenant?.name?.charAt(0) || 'S' }}</span>
            </div>
          </div>
          
          <h1 class="text-2xl font-bold">{{ currentTenant?.name || 'Willkommen bei Simy' }}</h1>
          <p class="text-white text-opacity-90 mt-1">
            Melden Sie sich in Ihrem Account an
          </p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="p-6">
        <!-- Session Check Loading -->
        <div v-if="isCheckingSession" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" :style="{ borderBottomColor: currentTenant?.primary_color || '#2563eb' }"></div>
          <p class="text-gray-600">Überprüfe Session...</p>
        </div>

        <!-- Login Form -->
        <form v-else @submit.prevent="handleLogin" class="space-y-4">
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
              :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
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
                :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
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
              @click="() => { console.log('Button clicked'); showForgotPasswordModal = true; console.log('Modal set to:', showForgotPasswordModal.value); }"
              class="text-sm text-blue-600 hover:underline hover:text-blue-800 cursor-pointer"
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
            :disabled="isLoading"
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ 
              background: currentTenant?.primary_color || '#2563eb',
              '--hover-color': (currentTenant?.primary_color || '#2563eb') + 'dd'
            }"
            @mouseenter="$event.target.style.opacity = '0.9'"
            @mouseleave="$event.target.style.opacity = '1'"
          >
            <span v-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>
        </form>

        <!-- Footer Links -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Noch kein Account? 
            <NuxtLink :to="tenantParam ? `/register/${tenantParam}` : '/auswahl'" class="font-medium hover:underline" :style="{ color: currentTenant?.primary_color || '#2563eb' }">
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
        <div :style="{ background: currentTenant?.primary_color || '#2563eb' }" class="text-white p-6 rounded-t-xl">
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
              :style="resetContactMethod === 'email' ? { background: currentTenant?.primary_color || '#2563eb' } : {}"
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
              :style="resetContactMethod === 'phone' ? { background: currentTenant?.primary_color || '#2563eb' } : {}"
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
              :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
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
              :style="{ '--tw-ring-color': currentTenant?.primary_color || '#2563eb' }"
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
              :style="{ background: currentTenant?.primary_color || '#2563eb' }"
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
import { getSupabase } from '~/utils/supabase'

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
const supabase = useSupabaseClient()

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
      console.log('🏢 Tenant updated from URL:', tenantParam.value)
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
    console.log('🔑 Starting login attempt for:', loginForm.value.email)
    
    // Login mit Supabase
    const loginSuccess = await login(loginForm.value.email, loginForm.value.password)
    
    if (!loginSuccess) {
      console.error('❌ Login failed - no success returned')
      const authStore = useAuthStore()
      const errorMsg = authStore.errorMessage
      
      if (errorMsg?.includes('Invalid login credentials')) {
        loginError.value = 'Falsches Passwort oder E-Mail-Adresse.'
      } else {
        loginError.value = errorMsg || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      }
      return
    }
    
    console.log('✅ Login successful')
    
    // Hole User-Daten um tenant_id zu bekommen
    const authStore = useAuthStore()
    const user = authStore.userProfile
    
    if (!user) {
      loginError.value = 'Fehler beim Laden des Benutzerprofils.'
      return
    }

    // Lade Tenant-Informationen
    let redirectPath = '/dashboard' // Fallback
    
    if (user.tenant_id) {
      console.log('🏢 Loading tenant info for tenant_id:', user.tenant_id)
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', user.tenant_id)
        .single()
      
      if (tenantError) {
        console.error('❌ Error loading tenant:', tenantError)
      } else if (tenant?.slug) {
        console.log('✅ Found tenant slug:', tenant.slug)
        
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
    console.log('🔄 Redirecting to:', redirectPath)
    router.push(redirectPath)
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    if (error.message?.includes('Invalid login credentials')) {
      loginError.value = 'Falsches Passwort oder E-Mail-Adresse.'
    } else {
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}

const handlePasswordReset = async () => {
  resetError.value = null
  resetSuccess.value = null

  const contact = resetContactMethod.value === 'email' ? resetForm.value.email : resetForm.value.phone

  if (!contact) {
    resetError.value = resetContactMethod.value === 'email' 
      ? 'Bitte geben Sie eine E-Mail-Adresse ein.' 
      : 'Bitte geben Sie eine Telefonnummer ein.'
    return
  }

  resetIsLoading.value = true

  try {
    console.log('🔐 Requesting password reset for:', contact)
    
    const response = await $fetch('/api/auth/password-reset-request', {
      method: 'POST',
      body: {
        contact,
        method: resetContactMethod.value,
        tenantId: null // We'll determine this from the contact
      }
    }) as any

    console.log('📧 Password reset response:', response)

    if (response?.success) {
      resetSuccess.value = resetContactMethod.value === 'email'
        ? `Ein Magic Link wurde an ${contact} gesendet. Bitte überprüfen Sie Ihren Posteingang.`
        : `Ein Magic Link wurde an ${contact} gesendet. Bitte überprüfen Sie Ihre SMS.`
      
      resetForm.value.email = ''
      resetForm.value.phone = ''
      
      console.log('✅ Password reset email/SMS sent, closing modal in 3 seconds...')
      
      // Schließe Modal nach 3 Sekunden
      setTimeout(() => {
        showForgotPasswordModal.value = false
        resetSuccess.value = null
      }, 3000)
    } else {
      resetError.value = response?.message || 'Fehler beim Senden des Magic Links. Bitte versuchen Sie es später erneut.'
    }
  } catch (error: any) {
    console.error('❌ Password reset error:', error)
    console.error('Error data:', error?.data)
    console.error('Error status:', error?.status)
    resetError.value = error?.data?.statusMessage || error?.message || 'Fehler beim Senden des Magic Links. Bitte versuchen Sie es später erneut.'
  } finally {
    resetIsLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout(supabase)
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
  // Warte kurz damit Auth-State nach Logout vollständig gelöscht ist
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Prüfe ob bereits angemeldet
  if (isAuthenticated.value && !isLoading.value) {
    console.log('🔄 User already authenticated, redirecting...')
    const authStore = useAuthStore()
    const user = authStore.userProfile
    
    if (user?.role === 'admin' || user?.role === 'tenant_admin') {
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
  background-color: #2563eb;
  border-color: #2563eb;
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

