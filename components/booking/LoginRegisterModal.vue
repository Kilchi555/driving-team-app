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
              Passwort <span class="text-red-500">*</span>
            </label>
            <input
              v-model="registerForm.password"
              type="password"
              required
              minlength="6"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mindestens 6 Zeichen"
            >
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
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
import { getSupabase } from '~/utils/supabase'
import { useRoute } from '#app'

const emit = defineEmits(['close', 'success'])

interface Props {
  initialTab?: 'login' | 'register'
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'login'
})

const route = useRoute()
const supabase = getSupabase()

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
  password: ''
})

const handleLogin = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    if (authError) throw authError

    logger.debug('✅ Login successful')
    emit('success')
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
    // Get tenant_id from route
    const slug = route.params.slug as string
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!tenantData) {
      throw new Error('Fahrschule nicht gefunden')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registerForm.value.email,
      password: registerForm.value.password
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Fehler beim Erstellen des Accounts')

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: registerForm.value.email,
        first_name: registerForm.value.first_name,
        last_name: registerForm.value.last_name,
        phone: registerForm.value.phone,
        role: 'client',
        tenant_id: tenantData.id,
        is_active: true
      })

    if (profileError) throw profileError

    logger.debug('✅ Registration successful')
    emit('success')
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.message || 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.'
  } finally {
    isLoading.value = false
  }
}
</script>

