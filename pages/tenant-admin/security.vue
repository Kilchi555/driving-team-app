<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Sicherheit & Login-Versuche</h1>
        <p class="text-gray-600 mt-2">Überwachen Sie verdächtige Login-Aktivitäten und Brute-Force-Versuche</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-4 mb-6 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-3 font-medium border-b-2 transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: All Login Attempts -->
      <div v-if="activeTab === 'all'" class="space-y-6">
        <!-- Filters -->
        <div class="bg-white rounded-lg shadow p-4 flex gap-4 flex-wrap">
          <input
            v-model="filters.email"
            type="email"
            placeholder="Nach Email filtern..."
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
          <input
            v-model="filters.ipAddress"
            type="text"
            placeholder="Nach IP filtern..."
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
          <select
            v-model="filters.success"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Ergebnisse</option>
            <option value="true">Erfolgreich</option>
            <option value="false">Fehlgeschlagen</option>
          </select>
          <button
            @click="loadLoginAttempts"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Aktualisieren
          </button>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Email</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">IP-Adresse</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Fehler</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Zeitstempel</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="attempt in filteredLoginAttempts" :key="attempt.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">{{ attempt.email }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ attempt.ip_address || '-' }}</td>
                <td class="px-6 py-4 text-sm">
                  <span
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium',
                      attempt.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ attempt.success ? 'Erfolgreich' : 'Fehlgeschlagen' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ attempt.error_message || '-' }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  {{ formatDate(attempt.attempted_at) }}
                </td>
              </tr>
              <tr v-if="loginAttempts.length === 0">
                <td colspan="5" class="px-6 py-4 text-center text-gray-600">
                  Keine Login-Versuche gefunden
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-600">
            Gesamt: {{ totalCount }} Versuche
          </div>
          <div class="flex gap-2">
            <button
              @click="currentPage = Math.max(1, currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Zurück
            </button>
            <span class="px-4 py-2">Seite {{ currentPage }}</span>
            <button
              @click="currentPage++"
              :disabled="loginAttempts.length < pageSize"
              class="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        </div>
      </div>

      <!-- Tab: Suspicious Activity -->
      <div v-if="activeTab === 'suspicious'" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <!-- Stats Cards -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-gray-600 text-sm font-medium">Verdächtige IPs (letzte Stunde)</div>
            <div class="text-3xl font-bold text-red-600 mt-2">{{ suspiciousStats.suspiciousIps }}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-gray-600 text-sm font-medium">Verdächtige Emails (letzte Stunde)</div>
            <div class="text-3xl font-bold text-orange-600 mt-2">{{ suspiciousStats.suspiciousEmails }}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-gray-600 text-sm font-medium">Blockierte IPs</div>
            <div class="text-3xl font-bold text-yellow-600 mt-2">{{ suspiciousStats.blockedIps }}</div>
          </div>
        </div>

        <!-- Suspicious Attempts Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Email / IP</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Fehlerhafte Versuche</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Letzter Versuch</th>
                <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">Aktion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="attempt in suspiciousAttempts" :key="`${attempt.email}-${attempt.ip_address}`" class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm">
                  <div class="font-medium text-gray-900">{{ attempt.email }}</div>
                  <div class="text-gray-600">{{ attempt.ip_address }}</div>
                </td>
                <td class="px-6 py-4 text-sm">
                  <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                    {{ attempt.failed_attempts }} Versuche
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  {{ formatDate(attempt.last_attempt) }}
                </td>
                <td class="px-6 py-4 text-sm">
                  <button
                    @click="blockIpAddress(attempt.ip_address)"
                    class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                  >
                    IP blockieren
                  </button>
                </td>
              </tr>
              <tr v-if="suspiciousAttempts.length === 0">
                <td colspan="4" class="px-6 py-4 text-center text-gray-600">
                  Keine verdächtigen Aktivitäten gefunden
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Settings -->
      <div v-if="activeTab === 'settings'" class="space-y-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold mb-4">Rate Limiting Einstellungen</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Max. Login-Versuche pro Minute
              </label>
              <input
                v-model.number="settings.maxLoginAttemptsPerMinute"
                type="number"
                min="1"
                max="100"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
              >
              <p class="text-xs text-gray-600 mt-1">Aktuell: 10 Versuche pro Minute</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Aufbewahrung von Login-Logs (Tage)
              </label>
              <input
                v-model.number="settings.logRetentionDays"
                type="number"
                min="1"
                max="365"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
              >
              <p class="text-xs text-gray-600 mt-1">Aktuell: 90 Tage</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Blockierte IP-Adressen
              </label>
              <textarea
                v-model="settings.blockedIpAddresses"
                rows="5"
                placeholder="Eine IP pro Zeile"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full font-mono text-sm"
              ></textarea>
            </div>
            <button
              @click="saveSettings"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

definePageMeta({
  middleware: 'superadmin',
  layout: 'default'
})

// Types
interface LoginAttempt {
  id: string
  email: string
  user_id: string | null
  ip_address: string | null
  success: boolean
  error_message: string | null
  attempted_at: string
  created_at: string
}

interface SuspiciousAttempt {
  email: string
  ip_address: string | null
  failed_attempts: number
  last_attempt: string
}

// State
const activeTab = ref('all')
const loginAttempts = ref<LoginAttempt[]>([])
const suspiciousAttempts = ref<SuspiciousAttempt[]>([])
const currentPage = ref(1)
const pageSize = 50
const totalCount = ref(0)

const tabs = [
  { id: 'all', label: 'Alle Login-Versuche' },
  { id: 'suspicious', label: 'Verdächtige Aktivitäten' },
  { id: 'settings', label: 'Einstellungen' }
]

const filters = ref({
  email: '',
  ipAddress: '',
  success: ''
})

const settings = ref({
  maxLoginAttemptsPerMinute: 10,
  logRetentionDays: 90,
  blockedIpAddresses: ''
})

const suspiciousStats = ref({
  suspiciousIps: 0,
  suspiciousEmails: 0,
  blockedIps: 0
})

// Computed
const filteredLoginAttempts = computed(() => {
  return loginAttempts.value.filter(attempt => {
    if (filters.value.email && !attempt.email.toLowerCase().includes(filters.value.email.toLowerCase())) {
      return false
    }
    if (filters.value.ipAddress && !attempt.ip_address?.includes(filters.value.ipAddress)) {
      return false
    }
    if (filters.value.success !== '' && attempt.success.toString() !== filters.value.success) {
      return false
    }
    return true
  })
})

// Methods
const loadLoginAttempts = async () => {
  try {
    const supabase = getSupabase()
    
    const { data, error, count } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact' })
      .order('attempted_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize, currentPage.value * pageSize - 1)
    
    if (error) throw error
    
    loginAttempts.value = data || []
    totalCount.value = count || 0
    
    logger.debug('✅ Loaded login attempts:', loginAttempts.value.length)
  } catch (error) {
    console.error('❌ Error loading login attempts:', error)
  }
}

const loadSuspiciousAttempts = async () => {
  try {
    const supabase = getSupabase()
    
    // Get suspicious attempts from the view
    const { data, error } = await supabase
      .from('suspicious_login_attempts')
      .select('*')
      .order('failed_attempts', { ascending: false })
    
    if (error) throw error
    
    suspiciousAttempts.value = data || []
    
    // Calculate stats
    suspiciousStats.value.suspiciousEmails = [...new Set((data || []).map(a => a.email))].length
    suspiciousStats.value.suspiciousIps = [...new Set((data || []).map(a => a.ip_address))].length
    
    logger.debug('✅ Loaded suspicious attempts:', suspiciousAttempts.value.length)
  } catch (error) {
    console.error('❌ Error loading suspicious attempts:', error)
  }
}

const blockIpAddress = async (ipAddress: string) => {
  if (!confirm(`IP-Adresse ${ipAddress} wirklich blockieren?`)) {
    return
  }
  
  try {
    const response = await $fetch('/api/security/block-ip', {
      method: 'POST',
      body: {
        ipAddress
      }
    }) as any

    if (response.success) {
      alert(`IP-Adresse ${ipAddress} wurde blockiert.`)
      logger.debug('✅ IP blocked:', ipAddress)
      await loadSuspiciousAttempts()
    }
  } catch (error: any) {
    console.error('❌ Error blocking IP:', error)
    alert(`Fehler beim Blockieren der IP: ${error.data?.statusMessage || error.message}`)
  }
}

const saveSettings = async () => {
  try {
    const response = await $fetch('/api/security/save-settings', {
      method: 'POST',
      body: {
        settings: settings.value
      }
    }) as any

    if (response.success) {
      alert('Sicherheitseinstellungen wurden gespeichert!')
      logger.debug('✅ Security settings saved:', settings.value)
    }
  } catch (error: any) {
    console.error('❌ Error saving settings:', error)
    alert(`Fehler beim Speichern: ${error.data?.statusMessage || error.message}`)
  }
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Lifecycle
onMounted(async () => {
  await loadLoginAttempts()
  await loadSuspiciousAttempts()
})
</script>

<style scoped>
/* Add any component-specific styles here */
</style>

