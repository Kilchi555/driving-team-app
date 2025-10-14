<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Erinnerungs-System Testen</h1>

    <!-- Manual Cron Trigger -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Manueller Cron-Job Trigger</h2>
      <p class="text-sm text-gray-600 mb-4">
        Führe den Erinnerungs-Cron-Job manuell aus, um alle fälligen Zahlungserinnerungen zu versenden.
      </p>
      
      <button
        @click="triggerCronJob"
        :disabled="isRunningCron"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="isRunningCron">
          <svg class="animate-spin inline-block h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Läuft...
        </span>
        <span v-else>Cron-Job ausführen</span>
      </button>

      <div v-if="cronResult" class="mt-4 p-4 rounded-lg" :class="cronResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <h3 class="font-semibold mb-2" :class="cronResult.success ? 'text-green-800' : 'text-red-800'">
          {{ cronResult.success ? '✅ Erfolgreich' : '❌ Fehler' }}
        </h3>
        <p class="text-sm" :class="cronResult.success ? 'text-green-700' : 'text-red-700'">
          {{ cronResult.message }}
        </p>
        <div v-if="cronResult.total_reminders !== undefined" class="mt-2 text-sm text-gray-700">
          <strong>Gesendete Erinnerungen:</strong> {{ cronResult.total_reminders }}
        </div>
        <div v-if="cronResult.results && cronResult.results.length > 0" class="mt-3">
          <details class="text-sm">
            <summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900">Details anzeigen</summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{{ JSON.stringify(cronResult.results, null, 2) }}</pre>
          </details>
        </div>
      </div>
    </div>

    <!-- Test Single Reminder -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Einzelne Erinnerung testen</h2>
      <p class="text-sm text-gray-600 mb-4">
        Sende eine Test-Erinnerung für eine spezifische Zahlung.
      </p>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Payment ID</label>
          <div class="flex gap-2">
            <input
              v-model="testPaymentId"
              type="text"
              placeholder="UUID der Zahlung"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              @click="loadLatestPaymentId"
              type="button"
              class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Neueste laden
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Erinnerungs-Stufe</label>
          <select
            v-model="testStage"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="first">1. Erinnerung</option>
            <option value="second">2. Erinnerung</option>
            <option value="final">Finale Warnung</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kanäle</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input v-model="testChannels.email" type="checkbox" class="mr-2" />
              <span class="text-sm">Email</span>
            </label>
            <label class="flex items-center">
              <input v-model="testChannels.sms" type="checkbox" class="mr-2" />
              <span class="text-sm">SMS</span>
            </label>
            <label class="flex items-center">
              <input v-model="testChannels.push" type="checkbox" class="mr-2" />
              <span class="text-sm">Push</span>
            </label>
          </div>
        </div>

        <button
          @click="sendTestReminder"
          :disabled="!testPaymentId || isSendingTest"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isSendingTest">Sende...</span>
          <span v-else>Test-Erinnerung senden</span>
        </button>
      </div>

      <div v-if="testResult" class="mt-4 p-4 rounded-lg" :class="testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <h3 class="font-semibold mb-2" :class="testResult.success ? 'text-green-800' : 'text-red-800'">
          {{ testResult.success ? '✅ Erfolgreich' : '❌ Fehler' }}
        </h3>
        <p class="text-sm" :class="testResult.success ? 'text-green-700' : 'text-red-700'">
          {{ testResult.error || 'Erinnerung wurde erfolgreich gesendet' }}
        </p>
      </div>
    </div>

    <!-- Reminder Logs -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Erinnerungs-Logs</h2>
        <button
          @click="loadReminderLogs"
          class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Aktualisieren
        </button>
      </div>

      <div v-if="isLoadingLogs" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="reminderLogs.length === 0" class="text-center py-8 text-gray-500">
        Keine Erinnerungs-Logs gefunden
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitpunkt</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kanal</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empfänger</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nachricht</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="log in reminderLogs" :key="log.id">
              <td class="px-4 py-3 text-sm text-gray-900">
                {{ formatDate(log.sent_at) }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-blue-100 text-blue-800': log.channel === 'email',
                        'bg-green-100 text-green-800': log.channel === 'sms',
                        'bg-purple-100 text-purple-800': log.channel === 'push'
                      }">
                  {{ log.channel }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {{ log.recipient }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-green-100 text-green-800': log.status === 'sent',
                        'bg-red-100 text-red-800': log.status === 'failed',
                        'bg-yellow-100 text-yellow-800': log.status === 'simulated'
                      }">
                  {{ log.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                {{ log.body }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Einfache Page Meta ohne Feature-Checks
// @ts-ignore - definePageMeta is auto-imported in Nuxt 3
definePageMeta({
  layout: 'admin'
})

const supabase = getSupabase()

// Cron Job State
const isRunningCron = ref(false)
const cronResult = ref<any>(null)

// Test Reminder State
const testPaymentId = ref('')
const testStage = ref<'first' | 'second' | 'final'>('first')
const testChannels = ref({
  email: true,
  sms: false,
  push: false
})
const isSendingTest = ref(false)
const testResult = ref<any>(null)

// Logs State
const reminderLogs = ref<any[]>([])
const isLoadingLogs = ref(false)

const triggerCronJob = async () => {
  isRunningCron.value = true
  cronResult.value = null

  try {
    const response = await $fetch('/api/cron/send-payment-reminders', {
      method: 'POST'
    })

    cronResult.value = response
    await loadReminderLogs() // Refresh logs
  } catch (error: any) {
    cronResult.value = {
      success: false,
      message: error.message || 'Fehler beim Ausführen des Cron-Jobs'
    }
  } finally {
    isRunningCron.value = false
  }
}

const sendTestReminder = async () => {
  if (!testPaymentId.value) return

  isSendingTest.value = true
  testResult.value = null

  try {
    // First, verify the payment exists
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, payment_status')
      .eq('id', testPaymentId.value)
      .single()

    if (paymentError || !payment) {
      testResult.value = {
        success: false,
        error: `Payment nicht gefunden: ${testPaymentId.value}. Bitte verwende eine gültige Payment ID.`
      }
      return
    }

    console.log('✅ Payment gefunden:', payment)

    const { useReminderService } = await import('~/composables/useReminderService.ts')
    const { sendPaymentReminder } = useReminderService()

    const result = await sendPaymentReminder(
      testPaymentId.value,
      testStage.value,
      testChannels.value
    )

    testResult.value = result
    await loadReminderLogs() // Refresh logs
  } catch (error: any) {
    testResult.value = {
      success: false,
      error: error.message || 'Fehler beim Senden der Test-Erinnerung'
    }
  } finally {
    isSendingTest.value = false
  }
}

const loadLatestPaymentId = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      testResult.value = {
        success: false,
        error: 'Keine Zahlungen gefunden. Erstelle zuerst eine Zahlung.'
      }
      return
    }

    testPaymentId.value = data.id
    console.log('✅ Neueste Payment ID geladen:', data)
  } catch (error: any) {
    console.error('Error loading latest payment:', error)
    testResult.value = {
      success: false,
      error: 'Fehler beim Laden der neuesten Zahlung'
    }
  }
}

const loadReminderLogs = async () => {
  isLoadingLogs.value = true

  try {
    const { data, error } = await supabase
      .from('reminder_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50)

    if (error) throw error
    reminderLogs.value = data || []
  } catch (error: any) {
    console.error('Error loading reminder logs:', error)
  } finally {
    isLoadingLogs.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadReminderLogs()
})
</script>

