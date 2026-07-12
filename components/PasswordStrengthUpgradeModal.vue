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

          <!-- New Password. id + form="" association lets the submit button in the
               footer (outside this <form>) trigger a real submit event, and the
               visually-hidden (clip, not display:none) username mirror lets
               Safari/Chrome associate the new password with the account. -->
          <form id="password-strength-form" autocomplete="on" @submit.prevent="updatePassword">
          <div style="clip:rect(0,0,0,0);position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;white-space:nowrap;border:0">
            <input type="email" name="username" autocomplete="username" :value="currentUserEmail" tabindex="-1" readonly>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort *
            </label>
            <input
              v-model="newPassword"
              :type="showPw ? 'text' : 'password'"
              name="new-password"
              autocomplete="new-password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Mindestens 12 Zeichen"
            />
            <div class="flex items-center justify-between mt-2">
              <button type="button" @click="useGeneratedPassword" class="text-xs font-semibold text-orange-600 underline">
                Sicheres Passwort vorschlagen
              </button>
              <button type="button" @click="showPw = !showPw" class="text-xs text-gray-500 hover:text-gray-700">
                {{ showPw ? 'Verbergen' : 'Anzeigen' }}
              </button>
            </div>
            <div class="mt-2 space-y-1">
              <p class="text-xs" :class="newPassword.length >= 12 ? 'text-green-600' : 'text-gray-500'">
                {{ newPassword.length >= 12 ? '✓' : '○' }} Mindestens 12 Zeichen
              </p>
              <!-- zxcvbn strength bar -->
              <div v-if="zxcvbnScore !== null" class="mt-1">
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
              <p v-if="hibpStatus === 'checking'" class="text-xs text-gray-400">⏳ Sicherheitsprüfung läuft...</p>
              <p v-else-if="hibpStatus === 'pwned'" class="text-xs text-red-600 font-medium">✗ Passwort {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks gefunden</p>
              <p v-else-if="hibpStatus === 'safe'" class="text-xs text-green-600">✓ Nicht in bekannten Datenlecks gefunden</p>
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
              name="confirm-new-password"
              autocomplete="new-password"
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
          </form>
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
          type="submit"
          form="password-strength-form"
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
import { ref, computed, watch } from 'vue'
import { logger } from '~/utils/logger'
import { usePasswordStrength, generateStrongPassword } from '~/composables/usePasswordStrength'
import { useAuthStore } from '~/stores/auth'

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

// Username hint for password managers (this modal always updates the
// currently logged-in user's own password)
const authStore = useAuthStore()
const currentUserEmail = computed(() => authStore.userProfile?.email || '')

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const isSubmitting = ref(false)
const showPw = ref(false)

// Unified password policy (length + zxcvbn strength + HIBP breach check)
const { zxcvbnScore, hibpStatus, hibpCount, strengthLabel, evaluate, isPasswordAcceptable } = usePasswordStrength()
watch(newPassword, (pw) => evaluate(pw))

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  newPassword.value = pw
  confirmPassword.value = pw
  showPw.value = true
  evaluate(pw)
}

const canSubmit = computed(() =>
  !!newPassword.value &&
  newPassword.value === confirmPassword.value &&
  isPasswordAcceptable(newPassword.value)
)

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
