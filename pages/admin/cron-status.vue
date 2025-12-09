<!-- pages/admin/cron-status.vue -->
<!-- Admin page to check cron job status and execution history -->

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Cron Job Status</h1>
        <p class="text-gray-600 mt-1">Überprüfen Sie den Status und die Ausführung der Cron Jobs</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Cron Status...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
        <div class="mt-4">
          <button
            @click="loadStatus"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Content -->
      <div v-else-if="status" class="space-y-6">
        <!-- Cron Jobs Overview -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Konfigurierte Cron Jobs</h2>
          <div class="space-y-4">
            <div
              v-for="(job, key) in status.cronJobs"
              :key="key"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900">{{ key }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ job.description }}</p>
                  <div class="mt-2 space-y-1 text-xs text-gray-500">
                    <div>Path: <code class="bg-gray-100 px-1 rounded">{{ job.path }}</code></div>
                    <div>Schedule: <code class="bg-gray-100 px-1 rounded">{{ job.schedule }}</code></div>
                    <div>Nächste Ausführung: {{ formatDateTime(job.nextRun) }}</div>
                  </div>
                </div>
                <div class="ml-4 flex flex-col items-end space-y-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Aktiv
                  </span>
                  <button
                    @click="runCronManually(job.path)"
                    :disabled="runningCron === job.path"
                    class="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span v-if="runningCron === job.path">Läuft...</span>
                    <span v-else>Manuell ausführen</span>
                  </button>
                </div>
              </div>
              
              <!-- Additional stats for automatic payments -->
              <div v-if="key === 'process-automatic-payments'" class="mt-4 grid grid-cols-3 gap-4">
                <div class="bg-blue-50 p-3 rounded">
                  <div class="text-sm text-blue-600 font-medium">Ausstehend</div>
                  <div class="text-2xl font-bold text-blue-900">{{ job.pendingPayments }}</div>
                </div>
                <div class="bg-orange-50 p-3 rounded">
                  <div class="text-sm text-orange-600 font-medium">Überfällig</div>
                  <div class="text-2xl font-bold text-orange-900">{{ job.overduePayments }}</div>
                </div>
                <div class="bg-green-50 p-3 rounded">
                  <div class="text-sm text-green-600 font-medium">Verarbeitet</div>
                  <div class="text-2xl font-bold text-green-900">{{ job.recentProcessed }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Statistics -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Zahlungsstatistiken</h2>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">{{ status.paymentStats.total }}</div>
              <div class="text-sm text-gray-600">Gesamt</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-600">{{ status.paymentStats.pending }}</div>
              <div class="text-sm text-gray-600">Ausstehend</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ status.paymentStats.completed }}</div>
              <div class="text-sm text-gray-600">Abgeschlossen</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ status.paymentStats.withAutomaticConsent }}</div>
              <div class="text-sm text-gray-600">Mit Auto-Zahlung</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">{{ status.paymentStats.processed }}</div>
              <div class="text-sm text-gray-600">Verarbeitet</div>
            </div>
          </div>
        </div>

        <!-- Pending Payments -->
        <div v-if="status.pendingPayments.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Ausstehende Automatische Zahlungen</h2>
            <button
              @click="testCronJob('process-automatic-payments')"
              :disabled="isTesting"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {{ isTesting ? 'Wird getestet...' : 'Jetzt testen' }}
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Date</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="payment in status.pendingPayments" :key="payment.id">
                  <td class="px-4 py-3 text-sm text-gray-900">{{ payment.id.substring(0, 8) }}...</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDateTime(payment.scheduled_payment_date) }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {{ payment.payment_status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Overdue Payments -->
        <div v-if="status.overduePayments.length > 0" class="bg-orange-50 rounded-lg shadow-sm border border-orange-200 p-6">
          <h2 class="text-lg font-semibold text-orange-900 mb-4">⚠️ Überfällige Zahlungen</h2>
          <p class="text-sm text-orange-700 mb-4">
            Diese Zahlungen hätten bereits verarbeitet werden sollen, sind aber noch ausstehend.
          </p>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-orange-200">
              <thead class="bg-orange-100">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase">Payment ID</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase">Scheduled Date</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-orange-200">
                <tr v-for="payment in status.overduePayments" :key="payment.id">
                  <td class="px-4 py-3 text-sm text-gray-900">{{ payment.id.substring(0, 8) }}...</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDateTime(payment.scheduled_payment_date) }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {{ payment.payment_status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Processed Payments -->
        <div v-if="status.recentProcessedPayments.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Kürzlich verarbeitete Zahlungen</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verarbeitet am</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="payment in status.recentProcessedPayments" :key="payment.id">
                  <td class="px-4 py-3 text-sm text-gray-900">{{ payment.id.substring(0, 8) }}...</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDateTime(payment.automatic_payment_processed_at) }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {{ payment.payment_status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vercel Info -->
        <div class="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 class="text-lg font-semibold text-blue-900 mb-2">Vercel Cron Jobs</h3>
          <p class="text-sm text-blue-800 mb-2">
            Die Cron Jobs sind in <code class="bg-blue-100 px-1 rounded">vercel.json</code> konfiguriert.
          </p>
          <p class="text-sm text-blue-700">
            Um die Ausführungslogs zu sehen, gehen Sie zum Vercel Dashboard → Ihr Projekt → Cron Jobs.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Meta
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const isLoading = ref(true)
const error = ref<string | null>(null)
const status = ref<any>(null)
const isTesting = ref(false)
const runningCron = ref<string | null>(null)

const loadStatus = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/admin/cron-status')
    logger.debug('📊 Cron Status loaded:', response)
    logger.debug('📊 Pending Payments:', response.pendingPayments)
    logger.debug('📊 Payment Stats:', response.paymentStats)
    status.value = response
  } catch (err: any) {
    console.error('Error loading cron status:', err)
    error.value = err.message || 'Fehler beim Laden des Cron Status'
  } finally {
    isLoading.value = false
  }
}

const testCronJob = async (jobKey: string) => {
  if (!confirm(`Möchten Sie den Cron Job "${jobKey}" jetzt manuell ausführen?`)) {
    return
  }

  isTesting.value = true

  try {
    const cronPath = status.value.cronJobs[jobKey].path
    const apiKey = process.env.CRON_API_KEY || 'your-api-key-here'
    
    const response = await $fetch(cronPath, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey
      }
    })

    alert('✅ Cron Job erfolgreich ausgeführt!\n\n' + JSON.stringify(response, null, 2))
    await loadStatus() // Reload status
  } catch (err: any) {
    console.error('Error testing cron job:', err)
    alert('❌ Fehler beim Testen des Cron Jobs:\n\n' + err.message)
  } finally {
    isTesting.value = false
  }
}

const runCronManually = async (cronPath: string) => {
  if (!cronPath) return
  
  runningCron.value = cronPath
  
  try {
    logger.debug('🔄 Running cron job manually:', cronPath)
    
    // Hole aktuellen Auth-Token von Supabase
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Nicht eingeloggt oder Session abgelaufen')
    }
    
    const response = await $fetch(cronPath, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    logger.debug('✅ Cron job completed:', response)
    
    alert(`✅ Cron Job erfolgreich ausgeführt!\n\nPath: ${cronPath}\n\nErgebnis:\n${JSON.stringify(response, null, 2)}`)
    
    // Reload status to show updated data
    await loadStatus()
  } catch (err: any) {
    console.error('❌ Error running cron job:', err)
    alert(`❌ Fehler beim Ausführen des Cron Jobs:\n\nPath: ${cronPath}\n\nFehler: ${err.message || err.data?.message || 'Unbekannter Fehler'}`)
  } finally {
    runningCron.value = null
  }
}

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadStatus()
})
</script>

