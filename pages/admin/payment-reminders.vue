<!-- pages/admin/payment-reminders.vue -->
<!-- Admin page to view payment reminder history -->

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Zahlungs-Erinnerungen</h1>
        <p class="text-gray-600 mt-1">Übersicht aller gesendeten Erinnerungen</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Erinnerungen...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="text-sm font-medium text-gray-600">Gesendete E-Mails</div>
            <div class="text-3xl font-bold text-blue-600 mt-2">{{ stats.totalEmails }}</div>
          </div>
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="text-sm font-medium text-gray-600">Gesendete SMS</div>
            <div class="text-3xl font-bold text-green-600 mt-2">{{ stats.totalSMS }}</div>
          </div>
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="text-sm font-medium text-gray-600">Fehlgeschlagen</div>
            <div class="text-3xl font-bold text-red-600 mt-2">{{ stats.totalFailed }}</div>
          </div>
        </div>

        <!-- Reminders Table -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold text-gray-900">Erinnerungs-Historie</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum/Zeit
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nummer
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="reminder in reminders" :key="reminder.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(reminder.sent_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="reminder.reminder_type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
                      class="px-2 py-1 text-xs font-medium rounded-full"
                    >
                      {{ reminder.reminder_type === 'email' ? 'E-Mail' : 'SMS' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{{ reminder.reminder_number }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {{ reminder.payment_id.substring(0, 8) }}...
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="reminder.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      class="px-2 py-1 text-xs font-medium rounded-full"
                    >
                      {{ reminder.status === 'sent' ? 'Gesendet' : 'Fehlgeschlagen' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="reminders.length === 0">
                  <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    Keine Erinnerungen gefunden
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const isLoading = ref(true)
const error = ref<string | null>(null)
const reminders = ref<any[]>([])
const stats = ref({
  totalEmails: 0,
  totalSMS: 0,
  totalFailed: 0
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadReminders = async () => {
  try {
    isLoading.value = true
    error.value = null

    const supabase = getSupabase()

    // Get user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.tenant_id) {
      throw new Error('Tenant not found')
    }

    // Get all reminders for this tenant
    const { data: reminderData, error: reminderError } = await supabase
      .from('payment_reminders')
      .select(`
        *,
        payments!inner (
          tenant_id
        )
      `)
      .eq('payments.tenant_id', userData.tenant_id)
      .order('sent_at', { ascending: false })
      .limit(100)

    if (reminderError) {
      throw reminderError
    }

    reminders.value = reminderData || []

    // Calculate stats
    stats.value.totalEmails = reminders.value.filter(r => r.reminder_type === 'email' && r.status === 'sent').length
    stats.value.totalSMS = reminders.value.filter(r => r.reminder_type === 'sms' && r.status === 'sent').length
    stats.value.totalFailed = reminders.value.filter(r => r.status === 'failed' || r.status === 'bounced').length

  } catch (err: any) {
    console.error('Error loading reminders:', err)
    error.value = err.message || 'Fehler beim Laden der Erinnerungen'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadReminders()
})
</script>

