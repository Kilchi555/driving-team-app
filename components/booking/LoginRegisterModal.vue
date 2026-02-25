<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-900">
          {{ activeTab === 'login' ? 'Anmelden' : 'Registrieren' }}
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200">
        <button
          @click="activeTab = 'login'"
          :class="[
            'flex-1 py-3 px-4 text-sm font-medium transition-colors',
            activeTab === 'login'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          ]"
        >
          Anmelden
        </button>
        <button
          @click="activeTab = 'register'"
          :class="[
            'flex-1 py-3 px-4 text-sm font-medium transition-colors',
            activeTab === 'register'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          ]"
        >
          Registrieren
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Login Form -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="loginForm.email"
              type="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ihre@email.com"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort <span class="text-red-500">*</span>
            </label>
            <input
              v-model="loginForm.password"
              type="password"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            >
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Wird angemeldet...' : 'Anmelden' }}
          </button>
        </form>

        <!-- Register Form -->
        <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorname <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.first_name"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nachname <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.last_name"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mustermann"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.email"
              type="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ihre@email.com"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Telefon <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.phone"
              type="tel"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+41 79 123 45 67"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Geburtsdatum <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.birthdate"
              type="date"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Straße <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.street"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hauptstraße"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nr. <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.street_nr"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="42"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                PLZ <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.zip"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8000"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Stadt <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.city"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Zürich"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.password"
              type="password"
              required
              minlength="12"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mindestens 12 Zeichen"
            >
            <p class="text-xs text-gray-600 mt-2">
              <span :class="{ 'text-green-600': passwordRequirements.minLength }">✓ Mindestens 12 Zeichen</span><br>
              <span :class="{ 'text-green-600': passwordRequirements.hasUpperCase }">✓ Großbuchstaben (A-Z)</span><br>
              <span :class="{ 'text-green-600': passwordRequirements.hasLowerCase }">✓ Kleinbuchstaben (a-z)</span><br>
              <span :class="{ 'text-green-600': passwordRequirements.hasNumber }">✓ Zahlen (0-9)</span><br>
              <span :class="{ 'text-green-600': passwordRequirements.hasSpecialChar }">✓ Sonderzeichen (!@#$%^&* etc.)</span>
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort wiederholen <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.password_confirm"
              type="password"
              required
              minlength="12"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': registerForm.password_confirm && registerForm.password !== registerForm.password_confirm }"
              placeholder="Passwort wiederholen"
            >
            <p v-if="registerForm.password_confirm && registerForm.password !== registerForm.password_confirm" class="text-xs text-red-600 mt-1">
              ⚠️ Passwörter stimmen nicht überein
            </p>
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="isLoading || (registerForm.password && registerForm.password_confirm && registerForm.password !== registerForm.password_confirm)"
            class="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Wird registriert...' : 'Registrieren' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from '#app'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'

const emit = defineEmits(['close', 'success'])

interface Props {
  initialTab?: 'login' | 'register'
  selectedStaffId?: string
  selectedCategory?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'login',
  selectedStaffId: undefined,
  selectedCategory: undefined
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>(props.initialTab)
const isLoading = ref(false)
const error = ref('')

const loginForm = ref({
  email: '',
  password: ''
})

const registerForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirm: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  birthdate: '',
  assigned_staff_id: props.selectedStaffId || '',
  category: props.selectedCategory || ''
})

// Password strength validation
const passwordRequirements = computed(() => {
  const password = registerForm.value.password
  return {
    minLength: password.length >= 12,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_\-]/.test(password)
  }
})

const isPasswordValid = computed(() => {
  const req = passwordRequirements.value
  return req.minLength && req.hasUpperCase && req.hasLowerCase && req.hasNumber && req.hasSpecialChar
})

const handleLogin = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: loginForm.value.email,
        password: loginForm.value.password
      },
      // IMPORTANT: Mark this as an auth endpoint so the interceptor doesn't redirect
      headers: {
        'X-Auth-Request': 'true'
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Login failed')
    }

    logger.debug('✅ Login successful')
    
    // Restore auth state from session
    const sessionRestored = await authStore.restoreSession()
    
    if (sessionRestored) {
      logger.debug('✅ Session restored successfully')
      emit('success')
    } else {
      throw new Error('Failed to restore session after login')
    }
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.message || 'Fehler beim Anmelden. Bitte überprüfen Sie Ihre Zugangsdaten.'
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  isLoading.value = true
  error.value = ''

  try {
    // Validate password confirmation
    if (registerForm.value.password !== registerForm.value.password_confirm) {
      error.value = 'Passwörter stimmen nicht überein'
      isLoading.value = false
      return
    }

    if (!registerForm.value.password) {
      error.value = 'Passwort ist erforderlich'
      isLoading.value = false
      return
    }

    const slug = route.params.slug as string

    const response = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        action: 'register-customer',
        email: registerForm.value.email,
        password: registerForm.value.password,
        first_name: registerForm.value.first_name,
        last_name: registerForm.value.last_name,
        phone: registerForm.value.phone,
        ...(registerForm.value.birthdate && { birthdate: registerForm.value.birthdate }),
        ...(registerForm.value.street && { street: registerForm.value.street }),
        ...(registerForm.value.street_nr && { street_nr: registerForm.value.street_nr }),
        ...(registerForm.value.zip && { zip: registerForm.value.zip }),
        ...(registerForm.value.city && { city: registerForm.value.city }),
        ...(registerForm.value.assigned_staff_id && { assigned_staff_id: registerForm.value.assigned_staff_id }),
        ...(registerForm.value.category && { category: registerForm.value.category }),
        slug
      },
      // IMPORTANT: Mark this as an auth endpoint so the interceptor doesn't redirect
      headers: {
        'X-Auth-Request': 'true'
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Registration failed')
    }

    logger.debug('✅ Registration successful')
    
    // Wait for cookies to be set on server
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Restore auth state from session (cookies should now have new tokens)
    const sessionRestored = await authStore.restoreSession()
    
    if (sessionRestored) {
      logger.debug('✅ Session restored successfully after registration')
      emit('success')
    } else {
      throw new Error('Failed to restore session after registration')
    }
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.message || 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.'
  } finally {
    isLoading.value = false
  }
}
</script>

