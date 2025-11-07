<!-- Vereinfachte Registrierungskomponente für Präferenzformular-Flow -->
<template>
  <div class="space-y-6">
    <div class="text-center mb-6">
      <h3 class="text-2xl font-bold text-gray-900 mb-2">Account erstellen</h3>
      <p class="text-gray-600">Erstellen Sie einen Account, um Ihre Präferenzen zu speichern</p>
    </div>

    <form @submit.prevent="handleRegistration" class="space-y-4">
      <!-- Passwort -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Passwort *</label>
        <div class="relative">
          <input
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Mindestens 8 Zeichen"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {{ showPassword ? '👁️' : '🔒' }}
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Mindestens 8 Zeichen, ein Großbuchstabe und eine Zahl
        </p>
      </div>

      <!-- Passwort wiederholen -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen *</label>
        <input
          v-model="formData.confirmPassword"
          type="password"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Passwort wiederholen"
        />
        <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" class="text-xs text-red-600 mt-1">
          Passwörter stimmen nicht überein
        </p>
      </div>

      <!-- AGB Checkbox -->
      <div class="flex items-start">
        <input
          v-model="formData.acceptTerms"
          type="checkbox"
          required
          class="mt-1 mr-2"
        />
        <label class="text-sm text-gray-700">
          Ich akzeptiere die <a href="/agb" target="_blank" class="text-blue-600 hover:underline">AGB</a> und die <a href="/datenschutz" target="_blank" class="text-blue-600 hover:underline">Datenschutzerklärung</a> *
        </label>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          @click="$emit('back')"
          class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Zurück
        </button>
        <button
          type="submit"
          :disabled="!canSubmit || isSubmitting"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {{ isSubmitting ? 'Registrierung läuft...' : 'Account erstellen' }}
        </button>
      </div>
    </form>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-700 text-sm">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { navigateTo } from '#app'

const props = defineProps<{
  tenantSlug: string
  preFilledData?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
}>()

const emit = defineEmits<{
  registrationComplete: []
  back: []
}>()

const supabase = getSupabase()
const authStore = useAuthStore()

const formData = ref({
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(() => {
  return formData.value.password &&
         formData.value.confirmPassword &&
         formData.value.password === formData.value.confirmPassword &&
         formData.value.password.length >= 8 &&
         /[A-Z]/.test(formData.value.password) &&
         /[0-9]/.test(formData.value.password) &&
         formData.value.acceptTerms
})

const handleRegistration = async () => {
  if (!canSubmit.value) return

  isSubmitting.value = true
  error.value = null

  try {
    if (!props.preFilledData?.email) {
      throw new Error('E-Mail-Adresse fehlt')
    }

    // 1. Check ob E-Mail bereits existiert
    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', props.preFilledData.email)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      throw new Error('Diese E-Mail-Adresse ist bereits registriert. Bitte loggen Sie sich ein.')
    }

    // 2. Get tenant ID from slug
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', props.tenantSlug)
      .eq('is_active', true)
      .single()

    if (!tenant) {
      throw new Error('Tenant nicht gefunden')
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: props.preFilledData.email,
      password: formData.value.password,
      options: {
        data: {
          first_name: props.preFilledData.first_name,
          last_name: props.preFilledData.last_name,
          phone: props.preFilledData.phone
        }
      }
    })

    if (authError) throw authError

    // 4. Wait a bit for trigger to create user in public.users
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 5. Update user with tenant and additional data
    if (authData.user) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          tenant_id: tenant.id,
          first_name: props.preFilledData.first_name,
          last_name: props.preFilledData.last_name,
          phone: props.preFilledData.phone || null,
          role: 'client'
        })
        .eq('auth_user_id', authData.user.id)

      if (updateError) {
        console.error('Error updating user:', updateError)
      }

      // 6. Login user
      await authStore.login(props.preFilledData.email, formData.value.password)

      // 7. Emit success
      emit('registrationComplete')
    }
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.message || 'Fehler bei der Registrierung'
  } finally {
    isSubmitting.value = false
  }
}
</script>

