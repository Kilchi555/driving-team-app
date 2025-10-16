<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(to bottom right, #2563eb15, #64748b15)">
    
    <!-- Login Form -->
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header mit Simy-Branding -->
      <div class="bg-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <!-- Simy Logo -->
          <div class="mb-4">
            <div class="w-12 h-12 mx-auto bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span class="text-2xl font-bold">S</span>
            </div>
          </div>
          
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
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            
            <a href="#" class="text-sm text-blue-600 hover:underline">
              Passwort vergessen?
            </a>
          </div>

          <!-- Error Message -->
          <div v-if="loginError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ loginError }}</p>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>
        </form>

        <!-- Footer Links -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Noch kein Account? 
            <NuxtLink to="/register" class="font-medium text-blue-600 hover:underline">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, definePageMeta, useHead } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { getSupabase } from '~/utils/supabase'

// Meta
definePageMeta({
  layout: false
})

// Composables
const router = useRouter()
const { login, logout, isLoggedIn, loading } = useAuthStore()
const { showError, showSuccess } = useUIStore()
const supabase = getSupabase()

// Computed
const isCheckingSession = computed<boolean>(() => Boolean((loading as any).value ?? loading))
const isAuthenticated = computed<boolean>(() => Boolean((isLoggedIn as any).value ?? isLoggedIn))

// State
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showPassword = ref(false)

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
    const loginSuccess = await login(loginForm.value.email, loginForm.value.password, supabase)
    
    if (!loginSuccess) {
      console.error('❌ Login failed - no success returned')
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
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
    } else if (error.message?.includes('Email not confirmed')) {
      loginError.value = 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'
    } else {
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout(supabase)
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    window.location.reload()
  } catch (error) {
    console.error('Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden.')
  }
}

// Lifecycle
onMounted(async () => {
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

