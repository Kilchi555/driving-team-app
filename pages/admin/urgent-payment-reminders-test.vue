<template>
  <div class="p-6 max-w-2xl mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        🧪 Urgent Payment Reminders Test
      </h1>
      <p class="text-gray-600">
        Teste den Cron Job für Zahlungserinnerungen bei Terminen < 24h oder vorbei
      </p>
    </div>

    <!-- Info Card -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <p class="text-sm text-blue-900">
        <strong>Test-Modus:</strong> Sendet Erinnerungen nur an <code class="bg-white px-1">pascal_kilchenmann@icloud.com</code>
      </p>
    </div>

    <!-- Status -->
    <div v-if="isLoading" class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Führe Cron Job aus...</p>
    </div>

    <div v-else-if="lastResult" class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div :class="[
        'mb-4 p-4 rounded-lg',
        lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      ]">
        <p :class="lastResult.success ? 'text-green-900' : 'text-red-900'">
          <strong>{{ lastResult.success ? '✅ Erfolgreich' : '❌ Fehler' }}:</strong>
          {{ lastResult.message }}
        </p>
      </div>

      <div v-if="lastResult.remindersCount !== undefined" class="grid grid-cols-2 gap-4 mb-4">
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600">Versendet</p>
          <p class="text-2xl font-bold text-green-600">{{ lastResult.remindersCount }}</p>
        </div>
        <div v-if="lastResult.failedCount > 0" class="bg-red-50 p-4 rounded-lg">
          <p class="text-sm text-gray-600">Fehler</p>
          <p class="text-2xl font-bold text-red-600">{{ lastResult.failedCount }}</p>
        </div>
      </div>

      <div v-if="lastResult.testedEmail" class="text-sm text-gray-600 mb-4">
        <strong>Test-E-Mail:</strong> {{ lastResult.testedEmail }}
      </div>

      <div class="text-xs text-gray-500">
        <strong>Ausgeführt:</strong> {{ lastRunTime }}
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex gap-3">
      <button
        @click="runCronJob"
        :disabled="isLoading"
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="isLoading">Wird ausgeführt...</span>
        <span v-else>🚀 Cron Job ausführen (Manuell)</span>
      </button>
    </div>

    <!-- Info Section -->
    <div class="mt-8 bg-gray-50 rounded-lg p-6">
      <h2 class="text-lg font-bold text-gray-900 mb-4">Was macht dieser Cron Job?</h2>
      <ul class="space-y-2 text-sm text-gray-700">
        <li>✅ Findet alle pending Zahlungen mit Wallee-Methode</li>
        <li>✅ Filtert: Termin liegt < 24h entfernt oder ist schon vorbei</li>
        <li>✅ Sendet E-Mail-Erinnerung an den Kunden</li>
        <li>✅ Setzt <code class="bg-white px-1">reminder_sent_at</code> Timestamp</li>
        <li>✅ Test-Modus: Nur E-Mails an pascal_kilchenmann@icloud.com</li>
      </ul>
    </div>

    <!-- API Info -->
    <div class="mt-6 bg-gray-50 rounded-lg p-6">
      <h2 class="text-lg font-bold text-gray-900 mb-4">Für Production Cron Setup:</h2>
      <div class="bg-white p-4 rounded border border-gray-200 font-mono text-sm mb-4">
        <p class="text-gray-600">Endpoint:</p>
        <p class="text-gray-900 font-bold">POST /api/cron/send-urgent-payment-reminders</p>
      </div>
      <div class="text-sm text-gray-600">
        <p>Cron Schedule: <code class="bg-white px-1">0 * * * *</code> (jeden Tag zur Stunde)</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-only'
})

const isLoading = ref(false)
const lastResult = ref<any>(null)
const lastRunTime = ref('')

const runCronJob = async () => {
  isLoading.value = true
  lastResult.value = null

  try {
    const result = await $fetch('/api/cron/send-urgent-payment-reminders', {
      method: 'POST',
      body: {
        manual: true
      }
    }) as any

    lastResult.value = result
    lastRunTime.value = new Date().toLocaleString('de-CH')
    console.log('✅ Cron job result:', result)
  } catch (error: any) {
    console.error('❌ Error running cron job:', error)
    lastResult.value = {
      success: false,
      message: error?.data?.statusMessage || error?.message || 'Fehler beim Ausführen des Cron Jobs'
    }
    lastRunTime.value = new Date().toLocaleString('de-CH')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
