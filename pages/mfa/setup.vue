<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Sicherheitsschlüssel einrichten</h1>
        <p class="text-gray-600 mt-2">Nutze Face ID oder Fingerabdruck für sicheres Login</p>
      </div>

      <!-- Step Indicator -->
      <div class="flex justify-between mb-8">
        <div v-for="(step, index) in steps" :key="index" class="flex-1">
          <div
            :class="[
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mx-auto',
              currentStep > index
                ? 'bg-green-500 text-white'
                : currentStep === index
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            ]"
          >
            {{ index + 1 }}
          </div>
          <div v-if="index < steps.length - 1" class="h-1 bg-gray-200 mt-2"></div>
        </div>
      </div>

      <!-- Step 1: Check Browser Support -->
      <div v-if="currentStep === 0" class="space-y-4">
        <div v-if="!webauthnSupported" class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm">
            Ihr Browser unterstützt keine Sicherheitsschlüssel. Bitte aktualisieren Sie Ihren Browser.
          </p>
        </div>
        <div v-else-if="!platformAuthAvailable" class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-yellow-700 text-sm">
            Ihr Gerät unterstützt möglicherweise keine Biometrie. Sie können aber einen USB-Sicherheitsschlüssel verwenden.
          </p>
        </div>
        <div v-else class="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-700 text-sm font-medium">
            Alles bereit! Ihr Gerät unterstützt Biometrie-Authentifizierung.
          </p>
        </div>

        <button
          @click="nextStep"
          :disabled="!webauthnSupported"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Weiter
        </button>
      </div>

      <!-- Step 2: Register Passkey -->
      <div v-if="currentStep === 1" class="space-y-4">
        <p class="text-gray-600 text-sm">
          Klicken Sie auf "Sicherheitsschlüssel registrieren" und halten Sie Ihren Finger auf den Sensor oder schauen Sie in die Kamera.
        </p>

        <button
          @click="registerPasskey"
          :disabled="isLoading"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <svg v-if="!isLoading" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
          </svg>
          <span v-if="isLoading" class="animate-spin">⏳</span>
          {{ isLoading ? 'Wird registriert...' : 'Sicherheitsschlüssel registrieren' }}
        </button>

        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- Step 3: Backup Codes -->
      <div v-if="currentStep === 2" class="space-y-4">
        <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-amber-900 text-sm font-medium mb-3">Sicherungscodes speichern</p>
          <p class="text-amber-800 text-xs mb-3">
            Falls Sie Ihren Sicherheitsschlüssel verlieren, können Sie diese Codes zum Anmelden verwenden. Speichern Sie sie an einem sicheren Ort!
          </p>

          <div class="bg-white p-3 rounded border border-amber-300 font-mono text-xs space-y-2">
            <div v-for="(code, index) in backupCodes" :key="index" class="flex justify-between items-center">
              <span>{{ code }}</span>
              <button
                @click="copyToClipboard(code)"
                class="text-blue-600 hover:text-blue-800 text-xs"
              >
                Kopieren
              </button>
            </div>
          </div>

          <button
            @click="downloadBackupCodes"
            class="w-full mt-3 py-2 px-3 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-sm font-medium"
          >
            Als Textdatei herunterladen
          </button>
        </div>

        <label class="flex items-center gap-2">
          <input
            v-model="codesBackedUp"
            type="checkbox"
            class="rounded border-gray-300"
          >
          <span class="text-sm text-gray-600">Ich habe die Sicherungscodes gespeichert</span>
        </label>

        <button
          @click="nextStep"
          :disabled="!codesBackedUp"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Fertig
        </button>
      </div>

      <!-- Success -->
      <div v-if="currentStep === 3" class="space-y-4 text-center">
        <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900">Fertiggestellt!</h2>
        <p class="text-gray-600">Ihr Sicherheitsschlüssel wurde erfolgreich registriert. Sie können sich jetzt damit anmelden.</p>
        <button
          @click="finishSetup"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Zum Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from '#imports'
import { logger } from '~/utils/logger'
import { isWebAuthnSupported, isPlatformAuthenticatorAvailable, startRegistration, arrayBufferToBase64 } from '~/utils/webauthn'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()

const steps = ['Browser-Kompatibilität', 'Sicherheitsschlüssel', 'Sicherungscodes', 'Fertig']
const currentStep = ref(0)
const isLoading = ref(false)
const error = ref<string | null>(null)
const webauthnSupported = ref(false)
const platformAuthAvailable = ref(false)
const backupCodes = ref<string[]>([])
const codesBackedUp = ref(false)

onMounted(async () => {
  webauthnSupported.value = isWebAuthnSupported()
  if (webauthnSupported.value) {
    platformAuthAvailable.value = await isPlatformAuthenticatorAvailable()
  }

  logger.debug('✅ MFA Setup - WebAuthn supported:', webauthnSupported.value)
  logger.debug('✅ MFA Setup - Platform authenticator:', platformAuthAvailable.value)
})

const nextStep = () => {
  currentStep.value++
}

const registerPasskey = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Get registration challenge from server
    const challengeResponse = await $fetch('/api/mfa/webauthn-register-start', {
      method: 'POST'
    }) as any

    logger.debug('✅ Got challenge for registration')

    // Start registration with browser API
    const credential = await startRegistration(challengeResponse)

    logger.debug('✅ Credential created by browser')

    // Send credential to server to complete registration
    const completeResponse = await $fetch('/api/mfa/webauthn-register-complete', {
      method: 'POST',
      body: {
        credential,
        deviceName: `${navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Device'} Biometric`
      }
    }) as any

    logger.debug('✅ Passkey registered successfully')

    if (completeResponse.backup_codes) {
      backupCodes.value = completeResponse.backup_codes
      nextStep()
    }
  } catch (err: any) {
    console.error('❌ Registration error:', err)
    error.value = err.data?.statusMessage || err.message || 'Fehler bei der Registrierung'
    logger.debug('❌ Registration failed:', error.value)
  } finally {
    isLoading.value = false
  }
}

const copyToClipboard = (code: string) => {
  navigator.clipboard.writeText(code)
  logger.debug('✅ Code copied to clipboard')
}

const downloadBackupCodes = () => {
  const content = `Sicherungscodes - Simy Driving Team\n${'='.repeat(40)}\n\n${backupCodes.value.join('\n')}\n\n${new Date().toLocaleString()}`
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const finishSetup = async () => {
  await router.push('/dashboard')
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>

