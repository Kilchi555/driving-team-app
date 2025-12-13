<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Sicherheitsbestätigung</h1>
        <p class="text-gray-600 mt-2">Verifizieren Sie Ihre Identität mit Ihrem Sicherheitsschlüssel</p>
      </div>

      <!-- MFA Status -->
      <div v-if="status === 'waiting'" class="space-y-4">
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p class="text-blue-700 text-sm">
            Bereit für Biometrie-Scan<br>
            <span class="text-xs text-blue-600 mt-2 block">Halten Sie Ihren Finger auf den Sensor oder schauen Sie in die Kamera</span>
          </p>
        </div>

        <button
          @click="startAuthentication"
          :disabled="isLoading"
          class="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <span v-if="!isLoading" class="animate-bounce">👆</span>
          <span v-else class="animate-spin">⏳</span>
          {{ isLoading ? 'Authentifiziere...' : 'Mit Sicherheitsschlüssel anmelden' }}
        </button>

        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-600">oder</span>
          </div>
        </div>

        <button
          @click="useFallback"
          class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          Sicherungscode verwenden
        </button>
      </div>

      <!-- Fallback: Email Code -->
      <div v-if="status === 'email-fallback'" class="space-y-4">
        <p class="text-gray-600 text-sm">
          Wir haben einen Code an {{ maskEmail }} gesendet. Geben Sie ihn ein:
        </p>

        <input
          v-model="emailCode"
          type="text"
          placeholder="000000"
          maxlength="6"
          class="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          @keyup.enter="verifyEmailCode"
        >

        <button
          @click="verifyEmailCode"
          :disabled="emailCode.length !== 6 || isLoading"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          Bestätigen
        </button>

        <button
          @click="status = 'waiting'"
          class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Zurück
        </button>
      </div>

      <!-- Fallback: Backup Code -->
      <div v-if="status === 'backup-code'" class="space-y-4">
        <p class="text-gray-600 text-sm">
          Geben Sie einen der Sicherungscodes ein:
        </p>

        <input
          v-model="backupCode"
          type="text"
          placeholder="ABC12345"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
          @keyup.enter="verifyBackupCode"
        >

        <button
          @click="verifyBackupCode"
          :disabled="!backupCode || isLoading"
          class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          Bestätigen
        </button>

        <button
          @click="status = 'waiting'"
          class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Zurück
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-700 text-sm">{{ error }}</p>
      </div>

      <!-- Success -->
      <div v-if="status === 'success'" class="text-center space-y-4">
        <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-gray-600">Authentifizierung erfolgreich!</p>
        <p class="text-xs text-gray-500">Wird weitergeleitet...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from '#imports'
import { logger } from '~/utils/logger'
import { startAuthentication } from '~/utils/webauthn'

definePageMeta({
  layout: 'blank'
})

const router = useRouter()
const route = useRoute()

const status = ref<'waiting' | 'email-fallback' | 'backup-code' | 'success'>('waiting')
const isLoading = ref(false)
const error = ref<string | null>(null)
const emailCode = ref('')
const backupCode = ref('')
const userId = ref<string | null>(null)
const userEmail = ref<string | null>(null)

const maskEmail = computed(() => {
  if (!userEmail.value) return 'your email'
  const [local, domain] = userEmail.value.split('@')
  return `${local.substring(0, 2)}***@${domain}`
})

onMounted(() => {
  // Get userId from route params or session
  userId.value = (route.query.user_id as string) || null
  userEmail.value = (route.query.email as string) || null

  if (!userId.value) {
    router.push('/login')
  }

  logger.debug('✅ MFA Challenge loaded for user:', userId.value)
})

const startAuthentication_handler = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Get challenge from server
    const challengeResponse = await $fetch('/api/mfa/webauthn-authenticate-start', {
      method: 'POST',
      body: {
        email: userEmail.value
      }
    }) as any

    if (!challengeResponse.success) {
      error.value = 'MFA konnte nicht verarbeitet werden'
      logger.debug('❌ MFA not available')
      return
    }

    logger.debug('✅ Got challenge for authentication')

    // Start authentication with browser API
    const assertion = await startAuthentication({
      challenge: challengeResponse.challenge,
      rpId: challengeResponse.rpId,
      timeout: challengeResponse.timeout,
      userVerification: challengeResponse.userVerification
    })

    logger.debug('✅ Assertion created by browser')

    // Send assertion to server
    const completeResponse = await $fetch('/api/mfa/webauthn-authenticate-complete', {
      method: 'POST',
      body: {
        userId: userId.value,
        assertion
      }
    }) as any

    logger.debug('✅ MFA verified successfully')

    status.value = 'success'

    // Redirect after short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  } catch (err: any) {
    console.error('❌ MFA error:', err)
    error.value = err.data?.statusMessage || err.message || 'Authentifizierung fehlgeschlagen'
    logger.debug('❌ Authentication failed:', error.value)
  } finally {
    isLoading.value = false
  }
}

const useFallback = () => {
  status.value = 'email-fallback'
}

const verifyEmailCode = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/mfa/verify-email-code', {
      method: 'POST',
      body: {
        userId: userId.value,
        code: emailCode.value
      }
    }) as any

    if (response.success) {
      status.value = 'success'
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  } catch (err: any) {
    error.value = 'Code ungültig oder abgelaufen'
    logger.debug('❌ Email code verification failed:', err)
  } finally {
    isLoading.value = false
  }
}

const verifyBackupCode = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/mfa/verify-backup-code', {
      method: 'POST',
      body: {
        userId: userId.value,
        code: backupCode.value
      }
    }) as any

    if (response.success) {
      status.value = 'success'
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  } catch (err: any) {
    error.value = 'Code ungültig oder bereits verwendet'
    logger.debug('❌ Backup code verification failed:', err)
  } finally {
    isLoading.value = false
  }
}

// Expose for template
const startAuthentication = startAuthentication_handler
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}
</style>

