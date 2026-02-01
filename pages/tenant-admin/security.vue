<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Sicherheit & Rate Limiting</h1>
      <p class="mt-2 text-gray-600">Überwachen Sie Anmeldeversuche, Blockierungen und Sicherheitsanomalien</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- Blocked IPs -->
      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Blockierte IPs (24h)</p>
            <p class="text-2xl font-semibold text-red-600">{{ stats.blockedIPs }}</p>
          </div>
        </div>
      </div>

      <!-- Failed Attempts -->
      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v2m0 4v2M9 17H5a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Fehlgeschlagene Versuche (24h)</p>
            <p class="text-2xl font-semibold text-yellow-600">{{ stats.failedAttempts }}</p>
          </div>
        </div>
      </div>

      <!-- Most Active IP -->
      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Aktuellste blockierte IP</p>
            <p class="text-2xl font-semibold text-blue-600 font-mono">{{ stats.mostActiveIP }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Operation Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Operation</label>
          <select 
            v-model="filters.operation"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Operationen</option>
            <option value="login">Login</option>
            <option value="register">Registrierung</option>
            <option value="password_reset">Passwort zurücksetzen</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select 
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            <option value="allowed">Erlaubt</option>
            <option value="blocked">Blockiert</option>
          </select>
        </div>

        <!-- Time Range -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
          <select 
            v-model="filters.timeRange"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Letzte Stunde</option>
            <option value="24h">Letzte 24h</option>
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
          </select>
        </div>

        <!-- Refresh Button -->
        <div class="flex items-end">
          <button
            @click="loadRateLimitLogs"
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      </div>
    </div>

    <!-- Rate Limit Logs Table -->
    <div class="bg-white rounded-xl shadow border overflow-hidden">
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          <p class="mt-4 text-gray-600">Logs werden geladen...</p>
        </div>
      </div>

      <div v-else-if="rateLimitLogs.length === 0" class="flex justify-center items-center py-12">
        <div class="text-center text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <p>Keine Rate Limit Logs vorhanden</p>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zeitstempel</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP-Adresse</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versuche</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Backoff</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="log in rateLimitLogs" :key="log.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDateTime(log.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  log.operation === 'login' ? 'bg-blue-100 text-blue-800' :
                  log.operation === 'register' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                ]">
                  {{ getOperationLabel(log.operation) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                {{ log.ip_address }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ log.email || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  log.status === 'allowed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]">
                  {{ log.status === 'allowed' ? 'Erlaubt' : 'Blockiert' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ log.request_count }}/{{ log.max_requests }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  log.backoff_level && log.backoff_level > 1 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                ]">
                  {{ getBackoffLabel(log.backoff_level) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="rateLimitLogs.length > 0" class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          Zeige {{ rateLimitLogs.length }} von {{ totalLogs }} Einträgen
        </div>
        <div class="flex gap-2">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Vorherige
          </button>
          <button
            @click="currentPage++"
            :disabled="rateLimitLogs.length < pageSize"
            class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Nächste
          </button>
        </div>
      </div>
    </div>

    <!-- Statistics -->
    <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top Blocked IPs -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Top 10 blockierte IPs</h3>
        <div class="space-y-3">
          <div v-for="(ip, index) in topBlockedIPs" :key="ip.ip_address" class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-semibold text-red-600">{{ index + 1 }}</span>
              </div>
              <span class="font-mono text-sm text-gray-900">{{ ip.ip_address }}</span>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900">{{ ip.block_count }} Blocks</p>
              <p class="text-xs text-gray-500">{{ ip.last_blocked }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Operation Stats -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Operation-Statistiken (24h)</h3>
        <div class="space-y-3">
          <div v-for="op in operationStats" :key="op.operation" class="border rounded-lg p-3">
            <div class="flex justify-between items-center mb-2">
              <span class="font-medium text-gray-900">{{ getOperationLabel(op.operation) }}</span>
              <span class="text-sm text-gray-600">{{ op.total }} Versuche</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                :style="{ width: calculatePercentage(op.blocked, op.total) + '%' }"
                class="h-2 bg-red-600 rounded-full"
              ></div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-gray-600">
              <span>Erlaubt: {{ op.total - op.blocked }}</span>
              <span>Blockiert: {{ op.blocked }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'

definePageMeta({ 
  layout: 'tenant-admin'
})

// ✅ MIGRATED TO API - const supabase = getSupabase()

// State
const isLoading = ref(false)
const rateLimitLogs = ref([])
const topBlockedIPs = ref([])
const operationStats = ref([])
const totalLogs = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)

const stats = ref({
  blockedIPs: 0,
  failedAttempts: 0,
  mostActiveIP: '-'
})

const filters = ref({
  operation: '',
  status: '',
  timeRange: '24h'
})

// Helper Functions
const getTimeRangeQuery = (range: string) => {
  const now = new Date()
  let startDate = new Date()

  switch (range) {
    case '1h':
      startDate.setHours(now.getHours() - 1)
      break
    case '24h':
      startDate.setDate(now.getDate() - 1)
      break
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
  }

  return startDate.toISOString()
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getOperationLabel = (op: string) => {
  const labels: Record<string, string> = {
    login: 'Login',
    register: 'Registrierung',
    password_reset: 'Passwort zurücksetzen'
  }
  return labels[op] || op
}

const getBackoffLabel = (level?: number) => {
  if (!level || level === 0) return 'Normal'
  const labels: Record<number, string> = {
    1: '1x (1 min)',
    2: '2x (2 min)',
    3: '5x (5 min)',
    4: '15x (15 min)',
    5: '60x (1h)',
    6: '240x (4h)'
  }
  return labels[level] || `${level}x`
}

const calculatePercentage = (blocked: number, total: number) => {
  return total === 0 ? 0 : Math.round((blocked / total) * 100)
}

// Data Loading
const loadRateLimitLogs = async () => {
  isLoading.value = true
  try {
    const timeRangeStart = getTimeRangeQuery(filters.value.timeRange)
    let query = supabase
      .from('rate_limit_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', timeRangeStart)
      .order('created_at', { ascending: false })

    if (filters.value.operation) {
      query = query.eq('operation', filters.value.operation)
    }

    if (filters.value.status) {
      query = query.eq('status', filters.value.status)
    }

    const { data, error, count } = await query.range(
      (currentPage.value - 1) * pageSize.value,
      currentPage.value * pageSize.value - 1
    )

    if (error) throw error

    rateLimitLogs.value = data || []
    totalLogs.value = count || 0

    // Load stats
    await loadStats()
    await loadTopBlockedIPs()
    await loadOperationStats()
  } catch (error) {
    console.error('Error loading rate limit logs:', error)
  } finally {
    isLoading.value = false
  }
}

const loadStats = async () => {
  try {
    const timeRangeStart = getTimeRangeQuery(filters.value.timeRange)

    // Count blocked IPs
    const { data: blockedData, error: blockedError } = await supabase
      .from('rate_limit_logs')
      .select('ip_address')
      .eq('status', 'blocked')
      .gte('created_at', timeRangeStart)

    const uniqueBlockedIPs = new Set(blockedData?.map(d => d.ip_address) || [])

    // Count failed attempts
    const { data: failedData, error: failedError } = await supabase
      .from('rate_limit_logs')
      .select('id')
      .eq('status', 'blocked')
      .gte('created_at', timeRangeStart)

    // Get most recently blocked IP
    const { data: recentBlockedData, error: recentError } = await supabase
      .from('rate_limit_logs')
      .select('ip_address')
      .eq('status', 'blocked')
      .gte('created_at', timeRangeStart)
      .order('created_at', { ascending: false })
      .limit(1)

    stats.value = {
      blockedIPs: uniqueBlockedIPs.size,
      failedAttempts: failedData?.length || 0,
      mostActiveIP: recentBlockedData?.[0]?.ip_address || '-'
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const loadTopBlockedIPs = async () => {
  try {
    const timeRangeStart = getTimeRangeQuery(filters.value.timeRange)

    const { data, error } = await supabase
      .from('rate_limit_logs')
      .select('ip_address, created_at')
      .eq('status', 'blocked')
      .gte('created_at', timeRangeStart)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by IP and count
    const ipStats: Record<string, { count: number; lastBlocked: string }> = {}
    data?.forEach(log => {
      if (!ipStats[log.ip_address]) {
        ipStats[log.ip_address] = { count: 0, lastBlocked: log.created_at }
      }
      ipStats[log.ip_address].count++
    })

    topBlockedIPs.value = Object.entries(ipStats)
      .map(([ip, stats]) => ({
        ip_address: ip,
        block_count: stats.count,
        last_blocked: formatDateTime(stats.lastBlocked)
      }))
      .sort((a, b) => b.block_count - a.block_count)
      .slice(0, 10)
  } catch (error) {
    console.error('Error loading top blocked IPs:', error)
  }
}

const loadOperationStats = async () => {
  try {
    const timeRangeStart = getTimeRangeQuery(filters.value.timeRange)

    const { data, error } = await supabase
      .from('rate_limit_logs')
      .select('operation, status')
      .gte('created_at', timeRangeStart)

    if (error) throw error

    // Group by operation
    const opStats: Record<string, { total: number; blocked: number }> = {
      login: { total: 0, blocked: 0 },
      register: { total: 0, blocked: 0 },
      password_reset: { total: 0, blocked: 0 }
    }

    data?.forEach(log => {
      if (opStats[log.operation]) {
        opStats[log.operation].total++
        if (log.status === 'blocked') {
          opStats[log.operation].blocked++
        }
      }
    })

    operationStats.value = Object.entries(opStats).map(([operation, stats]) => ({
      operation,
      ...stats
    }))
  } catch (error) {
    console.error('Error loading operation stats:', error)
  }
}

onMounted(() => {
  loadRateLimitLogs()
})
</script>

<style scoped>
</style>
