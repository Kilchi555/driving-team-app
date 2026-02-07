<template>
  <!-- Modal Backdrop -->
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header -->
      <div class="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-bold">Passwort-Sicherheit</h2>
            <p class="text-orange-100 text-sm mt-1">Ihre Sicherheit ist wichtig für uns</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <div>
          <p class="text-gray-700 mb-4">
            Ihr aktuelles Passwort erfüllt nicht unsere neuen Sicherheitsanforderungen. 
            Bitte aktualisieren Sie Ihr Passwort, um Ihren Account zu schützen.
          </p>

          <!-- New Password -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort *
            </label>
            <input
              v-model="newPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Mindestens 12 Zeichen"
            />
            <div class="mt-2 space-y-1">
              <p class="text-xs" :class="passwordChecks.length ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.length ? '✓' : '○' }} Mindestens 12 Zeichen
              </p>
              <p class="text-xs" :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.uppercase ? '✓' : '○' }} Großbuchstabe
              </p>
              <p class="text-xs" :class="passwordChecks.lowercase ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.lowercase ? '✓' : '○' }} Kleinbuchstabe
              </p>
              <p class="text-xs" :class="passwordChecks.number ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.number ? '✓' : '○' }} Zahl
              </p>
              <p class="text-xs" :class="passwordChecks.special ? 'text-green-600' : 'text-gray-500'">
                {{ passwordChecks.special ? '✓' : '○' }} Sonderzeichen (!@#$%^&*)
              </p>
            </div>
          </div>

          <!-- Confirm Password -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="confirmPassword && newPassword !== confirmPassword" class="text-red-600 text-sm mt-1">
              Passwörter stimmen nicht überein
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3">
        <button
          @click="skipForNow"
          :disabled="isSubmitting"
          class="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Später
        </button>
        <button
          @click="updatePassword"
          :disabled="!canSubmit || isSubmitting"
          class="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          <span v-if="isSubmitting">⏳ Wird gespeichert...</span>
          <span v-else>🔐 Passwort ändern</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const isSubmitting = ref(false)

// Helper function for password validation
const hasSpecialChar = (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)

const passwordChecks = computed(() => ({
  length: newPassword.value.length >= 12,
  uppercase: /[A-Z]/.test(newPassword.value),
  lowercase: /[a-z]/.test(newPassword.value),
  number: /[0-9]/.test(newPassword.value),
  special: hasSpecialChar(newPassword.value)
}))

const canSubmit = computed(() => {
  return newPassword.value && 
         confirmPassword.value && 
         newPassword.value === confirmPassword.value &&
         passwordChecks.value.length &&
         passwordChecks.value.uppercase &&
         passwordChecks.value.lowercase &&
         passwordChecks.value.number &&
         passwordChecks.value.special
})

const updatePassword = async () => {
  if (!canSubmit.value) return

  isSubmitting.value = true
  error.value = ''

  try {
    logger.debug('🔐 Updating password strength...')
    
    const response = await $fetch('/api/auth/update-password-strength', {
      method: 'POST',
      body: {
        newPassword: newPassword.value
      }
    })

    if (response?.success) {
      logger.debug('✅ Password strength updated successfully')
      emit('success')
      isOpen.value = false
      newPassword.value = ''
      confirmPassword.value = ''
    } else {
      throw new Error(response?.message || 'Passwort-Update fehlgeschlagen')
    }
  } catch (err: any) {
    console.error('❌ Password update error:', err)
    error.value = err?.data?.message || err?.message || 'Fehler beim Aktualisieren des Passworts'
  } finally {
    isSubmitting.value = false
  }
}

const skipForNow = () => {
  isOpen.value = false
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = ''
}
</script>
