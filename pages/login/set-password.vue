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
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Neues Passwort
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Passwort bestätigen
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort wiederholen"
            />
          </div>

          <!-- Password Requirements -->
          <div class="text-xs text-gray-500">
            <p class="font-medium mb-1">Passwort-Anforderungen:</p>
            <ul class="list-disc list-inside space-y-1">
              <li :class="password.length >= 8 ? 'text-green-600' : 'text-gray-500'">
                Mindestens 8 Zeichen
              </li>
              <li :class="hasUppercase ? 'text-green-600' : 'text-gray-500'">
                Mindestens ein Großbuchstabe
              </li>
              <li :class="hasNumber ? 'text-green-600' : 'text-gray-500'">
                Mindestens eine Zahl
              </li>
              <li :class="passwordsMatch ? 'text-green-600' : 'text-gray-500'">
                Passwörter stimmen überein
              </li>
            </ul>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const supabase = getSupabase()

// State
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')
const isSuccess = ref(false)
const userInfo = ref<any>(null)
const tenantSlug = ref('')

// Computed
const hasUppercase = computed(() => /[A-Z]/.test(password.value))
const hasNumber = computed(() => /\d/.test(password.value))
const passwordsMatch = computed(() => password.value === confirmPassword.value && password.value.length > 0)

const isValidPassword = computed(() => {
  return password.value.length >= 8 && 
         hasUppercase.value && 
         hasNumber.value && 
         passwordsMatch.value
})

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
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.value
    })

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Create business user record if not exists
    const { data: { user } } = await supabase.auth.getUser()
    if (user && userInfo.value) {
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: user.id,
          first_name: userInfo.value.first_name,
          last_name: userInfo.value.last_name,
          email: user.email,
          phone: userInfo.value.phone || null,
          role: userInfo.value.role === 'sub_admin' ? 'admin' : userInfo.value.role,
          admin_level: userInfo.value.role === 'sub_admin' ? 'sub_admin' : null,
          is_primary_admin: false,
          is_active: true,
          tenant_id: userInfo.value.tenant_id,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.warn('Warning creating business user:', insertError)
        // Don't fail the whole process if business user creation fails
      }
    }

    isSuccess.value = true
    console.log('✅ Password set successfully')

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
    const { data: { user }, error } = await supabase.auth.getUser()
    
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

    // Get tenant slug for redirect
    if (userInfo.value.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', userInfo.value.tenant_id)
        .single()
      
      tenantSlug.value = tenant?.slug || 'default'
    }

    console.log('👤 User info loaded from invitation:', userInfo.value)

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
