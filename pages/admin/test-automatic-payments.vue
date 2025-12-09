<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Automatische Zahlungen testen</h1>

    <!-- Manual Cron Trigger -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Cron-Job manuell ausführen</h2>
      <p class="text-sm text-gray-600 mb-4">
        Führe den Cron-Job für automatische Zahlungen manuell aus, um alle fälligen Zahlungen zu verarbeiten.
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
        <div v-if="cronResult.processed !== undefined" class="mt-2 text-sm text-gray-700">
          <strong>Verarbeitet:</strong> {{ cronResult.processed }} Zahlung(en)
        </div>
        <div v-if="cronResult.failed !== undefined" class="mt-1 text-sm text-gray-700">
          <strong>Fehlgeschlagen:</strong> {{ cronResult.failed }} Zahlung(en)
        </div>
        <div v-if="cronResult.results && cronResult.results.length > 0" class="mt-3">
          <details class="text-sm">
            <summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900">Details anzeigen</summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{{ JSON.stringify(cronResult.results, null, 2) }}</pre>
          </details>
        </div>
      </div>
    </div>

    <!-- Payment Status Overview -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Aktuelle Zahlungen mit automatischer Abbuchung</h2>
      
      <button
        @click="loadPayments"
        :disabled="isLoadingPayments"
        class="mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {{ isLoadingPayments ? 'Lädt...' : 'Aktualisieren' }}
      </button>

      <div v-if="payments.length === 0 && !isLoadingPayments" class="text-gray-500 text-sm">
        Keine Zahlungen mit automatischer Abbuchung gefunden.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="payment in payments"
          :key="payment.id"
          class="p-4 border rounded-lg"
          :class="{
            'bg-yellow-50 border-yellow-200': !payment.automatic_payment_processed && new Date(payment.scheduled_payment_date) <= new Date(),
            'bg-green-50 border-green-200': payment.automatic_payment_processed,
            'bg-blue-50 border-blue-200': !payment.automatic_payment_processed && new Date(payment.scheduled_payment_date) > new Date()
          }"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-semibold text-gray-900">
                Payment ID: {{ payment.id.substring(0, 8) }}...
              </div>
              <div class="text-sm text-gray-600 mt-1">
                <div><strong>Termin:</strong> {{ formatDate(payment.appointments?.start_time) }}</div>
                <div><strong>Betrag:</strong> {{ formatCurrency((payment.total_amount_rappen || 0) / 100) }}</div>
                <div><strong>Status:</strong> {{ payment.payment_status }}</div>
                <div><strong>Zahlungsmethode:</strong> {{ payment.payment_method }}</div>
                <div><strong>Geplant für:</strong> {{ formatDate(payment.scheduled_payment_date) }}</div>
                <div><strong>Verarbeitet:</strong> {{ payment.automatic_payment_processed ? '✅ Ja' : '❌ Nein' }}</div>
              </div>
            </div>
            <div class="ml-4">
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                :class="{
                  'bg-yellow-200 text-yellow-800': !payment.automatic_payment_processed && new Date(payment.scheduled_payment_date) <= new Date(),
                  'bg-green-200 text-green-800': payment.automatic_payment_processed,
                  'bg-blue-200 text-blue-800': !payment.automatic_payment_processed && new Date(payment.scheduled_payment_date) > new Date()
                }"
              >
                {{
                  payment.automatic_payment_processed ? 'Verarbeitet' :
                  new Date(payment.scheduled_payment_date) <= new Date() ? 'Fällig' :
                  'Geplant'
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick SQL Queries -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Nützliche SQL-Queries</h2>
      <div class="space-y-3 text-sm">
        <details class="border rounded p-3">
          <summary class="cursor-pointer font-medium text-gray-700">Fällige Zahlungen finden</summary>
          <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">SELECT 
  p.id,
  p.appointment_id,
  p.payment_method,
  p.automatic_payment_consent,
  p.automatic_payment_processed,
  p.scheduled_payment_date,
  a.status as appointment_status,
  a.start_time
FROM payments p
JOIN appointments a ON p.appointment_id = a.id
WHERE p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.payment_method = 'wallee'
  AND p.scheduled_payment_date <= NOW()
ORDER BY p.scheduled_payment_date ASC;</pre>
        </details>
        <details class="border rounded p-3">
          <summary class="cursor-pointer font-medium text-gray-700">Confirmation Token finden</summary>
          <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">SELECT 
  id,
  confirmation_token,
  status,
  start_time,
  created_at
FROM appointments
WHERE status = 'pending_confirmation'
ORDER BY created_at DESC
LIMIT 10;</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSupabase } from '~/utils/supabase'

definePageMeta({
  middleware: 'admin'
})

const isRunningCron = ref(false)
const cronResult = ref<any>(null)
const payments = ref<any[]>([])
const isLoadingPayments = ref(false)

const triggerCronJob = async () => {
  isRunningCron.value = true
  cronResult.value = null

  try {
    const result = await $fetch('/api/cron/process-automatic-payments', {
      method: 'POST'
    })

    cronResult.value = result
    logger.debug('✅ Cron job result:', result)
    
    // Lade Payments neu
    await loadPayments()
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    cronResult.value = {
      success: false,
      message: error.message || 'Fehler beim Ausführen des Cron-Jobs'
    }
  } finally {
    isRunningCron.value = false
  }
}

const loadPayments = async () => {
  isLoadingPayments.value = true

  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        appointment_id,
        payment_method,
        payment_status,
        automatic_payment_consent,
        automatic_payment_processed,
        scheduled_payment_date,
        total_amount_rappen,
        payment_method_id,
        appointments (
          id,
          start_time,
          status,
          title
        )
      `)
      .eq('automatic_payment_consent', true)
      .not('scheduled_payment_date', 'is', null)
      .order('scheduled_payment_date', { ascending: true })
      .limit(50)

    if (error) throw error

    payments.value = data || []
    logger.debug('✅ Loaded payments:', payments.value.length)
  } catch (error: any) {
    console.error('❌ Error loading payments:', error)
    alert('Fehler beim Laden der Zahlungen: ' + error.message)
  } finally {
    isLoadingPayments.value = false
  }
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Ungültiges Datum'
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount)
}

// Lade Payments beim Mount
onMounted(() => {
  loadPayments()
})
</script>

