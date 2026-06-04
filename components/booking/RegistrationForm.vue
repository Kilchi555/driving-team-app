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
            placeholder="Mindestens 12 Zeichen"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {{ showPassword ? '👁️' : '🔒' }}
          </button>
        </div>
        <div class="flex items-center justify-between mt-2">
          <button type="button" @click="useGeneratedPassword" class="text-xs font-semibold text-blue-600 underline">
            Sicheres Passwort vorschlagen
          </button>
        </div>
        <!-- zxcvbn strength bar -->
        <div v-if="zxcvbnScore !== null" class="mt-2">
          <div class="flex gap-1 h-1.5">
            <div v-for="i in 4" :key="i" class="flex-1 rounded-full transition-colors duration-300"
              :class="i <= zxcvbnScore ? [
                zxcvbnScore <= 1 ? 'bg-red-500' :
                zxcvbnScore === 2 ? 'bg-yellow-400' :
                zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500'
              ] : 'bg-gray-200'"
            />
          </div>
          <p class="text-xs mt-1" :class="
            zxcvbnScore <= 1 ? 'text-red-500' :
            zxcvbnScore === 2 ? 'text-yellow-600' :
            zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'
          ">
            {{ strengthLabel }}<span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
          </p>
        </div>
        <!-- HIBP -->
        <p v-if="hibpStatus === 'checking'" class="text-xs text-gray-400 mt-1">⏳ Sicherheitsprüfung läuft...</p>
        <p v-else-if="hibpStatus === 'pwned'" class="text-xs text-red-600 font-medium mt-1">✗ Passwort {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks gefunden – bitte ein anderes wählen</p>
        <p v-else-if="hibpStatus === 'safe'" class="text-xs text-green-600 mt-1">✓ Nicht in bekannten Datenlecks gefunden</p>
        <p v-else class="text-xs text-gray-500 mt-1">Mindestens 12 Zeichen – ein Satz oder eine Phrase ist ideal.</p>
      </div>

      <!-- Passwort wiederholen -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen *</label>
        <input
          v-model="formData.confirmPassword"
          :type="showPassword ? 'text' : 'password'"
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
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { navigateTo } from '#app'
import { logger } from '~/utils/logger'
import { usePasswordStrength, generateStrongPassword } from '~/composables/usePasswordStrength'

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

const authStore = useAuthStore()

const formData = ref({
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

// Unified password policy (length + zxcvbn strength + HIBP breach check)
const { zxcvbnScore, hibpStatus, hibpCount, strengthLabel, evaluate, isPasswordAcceptable } = usePasswordStrength()
watch(() => formData.value.password, (pw) => evaluate(pw))

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  formData.value.password = pw
  formData.value.confirmPassword = pw
  showPassword.value = true
  evaluate(pw)
}

const canSubmit = computed(() => {
  return formData.value.password &&
         formData.value.confirmPassword &&
         formData.value.password === formData.value.confirmPassword &&
         isPasswordAcceptable(formData.value.password) &&
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

    const response = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        action: 'register-customer',
        email: props.preFilledData.email,
        password: formData.value.password,
        first_name: props.preFilledData.first_name || '',
        last_name: props.preFilledData.last_name || '',
        phone: props.preFilledData.phone || '',
        slug: props.tenantSlug
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Registrierung fehlgeschlagen')
    }

    logger.debug('✅ Registration successful via API')

    await authStore.login(props.preFilledData.email, formData.value.password)

    // Emit success
    emit('registrationComplete')
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.message || 'Fehler bei der Registrierung'
  } finally {
    isSubmitting.value = false
  }
}
</script>

