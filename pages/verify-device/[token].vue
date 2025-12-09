<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
      <!-- Loading State -->
      <div v-if="isVerifying" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Gerät wird verifiziert...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="isVerified" class="text-center">
        <div class="text-green-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Gerät erfolgreich verifiziert!</h2>
        <p class="text-gray-600 mb-6">
          Ihr Gerät wurde erfolgreich bestätigt. Sie können sich nun anmelden.
        </p>
        <button
          @click="goToLogin"
          class="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Zur Anmeldung
        </button>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center">
        <div class="text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Verifikation fehlgeschlagen</h2>
        <p class="text-gray-600 mb-6">{{ error }}</p>
        <button
          @click="goToLogin"
          class="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          Zurück zum Login
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

const isVerifying = ref(true)
const isVerified = ref(false)
const error = ref<string | null>(null)

const verifyDevice = async () => {
  const token = route.params.token as string

  if (!token) {
    error.value = 'Ungültiger Verifikations-Token'
    isVerifying.value = false
    return
  }

  try {
    logger.debug('🔐 Verifying device with token:', token)

    // Finde Gerät mit diesem Token
    const { data: device, error: deviceError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (deviceError || !device) {
      error.value = 'Verifikations-Token nicht gefunden oder bereits verwendet'
      isVerifying.value = false
      return
    }

    // Prüfe ob Token abgelaufen ist
    if (device.verification_expires_at) {
      const expiresAt = new Date(device.verification_expires_at)
      const now = new Date()

      if (expiresAt < now) {
        error.value = 'Verifikations-Token ist abgelaufen. Bitte fordern Sie einen neuen Link an.'
        isVerifying.value = false
        return
      }
    }

    // Prüfe ob bereits verifiziert
    if (device.verified_at) {
      error.value = 'Dieses Gerät wurde bereits verifiziert'
      isVerifying.value = false
      return
    }

    // Markiere Gerät als verifiziert
    const { error: updateError } = await supabase
      .from('user_devices')
      .update({
        verified_at: new Date().toISOString(),
        is_trusted: true, // Automatisch als trusted markieren nach Verifikation
        verification_token: null // Token löschen
      })
      .eq('id', device.id)

    if (updateError) {
      throw updateError
    }

    logger.debug('✅ Device verified successfully:', device.id)
    isVerified.value = true
    isVerifying.value = false

    // Auto-redirect nach 3 Sekunden
    setTimeout(() => {
      goToLogin()
    }, 3000)

  } catch (err: any) {
    console.error('❌ Error verifying device:', err)
    error.value = err.message || 'Fehler bei der Geräte-Verifikation'
    isVerifying.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

onMounted(() => {
  verifyDevice()
})
</script>

