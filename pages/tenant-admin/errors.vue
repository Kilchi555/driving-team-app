<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Error Monitoring</h1>
        <p class="mt-2 text-gray-600">Überwachen und verwalten Sie Fehler in Ihrer Anwendung</p>
      </div>
      <button
        @click="groupErrors"
        :disabled="isGrouping"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {{ isGrouping ? 'Gruppiert...' : 'Errors Gruppieren' }}
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v2m0 4v2M9 5a3 3 0 016 0"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Fehler (heute)</p>
            <p class="text-2xl font-semibold text-red-600">{{ stats.todayErrors }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M9 3a9 9 0 1118 0 9 9 0 01-18 0z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Offene Fehler</p>
            <p class="text-2xl font-semibold text-orange-600">{{ stats.openErrors }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Behoben</p>
            <p class="text-2xl font-semibold text-green-600">{{ stats.fixedErrors }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 00-9.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Benutzer</p>
            <p class="text-2xl font-semibold text-yellow-600">{{ stats.affectedUsers }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Rate</p>
            <p class="text-2xl font-semibold text-blue-600">{{ stats.errorRate }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Trends Chart -->
    <div class="bg-white rounded-xl shadow border p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Error Trends (30 Tage)</h2>
      <div v-if="trends.length > 0" class="h-64 bg-gray-50 rounded-lg p-4 flex items-end justify-between gap-1">
        <div v-for="(point, idx) in trends.slice(-48)" :key="idx" class="flex-1 flex flex-col items-center">
          <div class="w-full bg-red-400 rounded-t" :style="{ height: Math.max(10, (point.total / maxTrendValue) * 100) + '%' }"></div>
          <span class="text-xs text-gray-500 mt-2">{{ new Date(point.timestamp).getHours() }}h</span>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500">Keine Trend-Daten verfügbar</div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Level</label>
          <select v-model="filters.level" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Alle</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select v-model="filters.status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Alle</option>
            <option value="open">Offen</option>
            <option value="investigating">Untersucht</option>
            <option value="fixed">Behoben</option>
            <option value="ignored">Ignoriert</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Komponente</label>
          <select v-model="filters.component" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Alle</option>
            <option v-for="comp in uniqueComponents" :key="comp" :value="comp">{{ comp }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
          <select v-model="filters.timeRange" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="1h">Letzte Stunde</option>
            <option value="24h">Letzte 24h</option>
            <option value="7d">Letzte 7 Tage</option>
            <option value="30d">Letzte 30 Tage</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
          <input v-model="filters.search" type="text" placeholder="Nachricht..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div class="flex items-end">
          <button @click="loadErrors" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Aktualisieren
          </button>
        </div>
      </div>
    </div>

    <!-- Error Groups / List -->
    <div class="bg-white rounded-xl shadow border overflow-hidden">
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          <p class="mt-4 text-gray-600">Fehler werden geladen...</p>
        </div>
      </div>

      <div v-else-if="filteredErrors.length === 0" class="flex justify-center items-center py-12">
        <div class="text-center text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <p>Keine Fehler vorhanden</p>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zeitstempel</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Komponente</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nachricht</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="error in filteredErrors" :key="error.id" class="hover:bg-gray-50 cursor-pointer">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDateTime(error.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  error.level === 'error' ? 'bg-red-100 text-red-800' :
                  error.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                ]">
                  {{ error.level.toUpperCase() }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ error.component }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                {{ error.message }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <select v-model="error.status" @change="updateErrorStatus(error)" :class="[
                  'px-2 py-1 text-xs font-semibold rounded-full border-0',
                  error.status === 'open' ? 'bg-orange-100 text-orange-800' :
                  error.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                  error.status === 'fixed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                ]">
                  <option value="open">Offen</option>
                  <option value="investigating">Untersucht</option>
                  <option value="fixed">Behoben</option>
                  <option value="ignored">Ignoriert</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="selectedError = error" class="text-blue-600 hover:text-blue-900">
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="filteredErrors.length > 0" class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          Zeige {{ filteredErrors.length }} von {{ totalErrors }} Einträgen
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
            :disabled="filteredErrors.length < pageSize"
            class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Nächste
          </button>
        </div>
      </div>
    </div>

    <!-- Error Detail Modal -->
    <div v-if="selectedError" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-96 overflow-auto">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Error Details</h2>
            <button @click="selectedError = null" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500">Nachricht</h3>
              <p class="mt-1 text-sm text-gray-900 break-words">{{ selectedError.message }}</p>
            </div>

            <div v-if="selectedError.data" class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-sm font-medium text-gray-900 mb-2">Stack Trace</h3>
              <pre class="text-xs text-gray-700 overflow-auto max-h-48">{{ selectedError.data.stack || 'N/A' }}</pre>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <h3 class="text-sm font-medium text-gray-500">Browser</h3>
                <p class="mt-1 text-sm text-gray-900">{{ selectedError.data?.browserName || 'Unknown' }}</p>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-500">URL</h3>
                <p class="mt-1 text-sm text-gray-900 truncate">{{ selectedError.url }}</p>
              </div>
            </div>

            <div v-if="selectedError.resolution_notes" class="bg-blue-50 p-4 rounded-lg">
              <h3 class="text-sm font-medium text-gray-900 mb-2">Notizen</h3>
              <p class="text-sm text-gray-700">{{ selectedError.resolution_notes }}</p>
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
const isGrouping = ref(false)
const errorLogs = ref<any[]>([])
const trends = ref<any[]>([])
const totalErrors = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const selectedError = ref<any>(null)

const stats = ref({
  todayErrors: 0,
  openErrors: 0,
  fixedErrors: 0,
  affectedUsers: 0,
  errorRate: 0,
})

const filters = ref({
  level: '',
  status: '',
  component: '',
  search: '',
  timeRange: '24h',
})

// Computed
const maxTrendValue = computed(() => {
  return Math.max(...trends.value.map(t => t.total), 1)
})

const uniqueComponents = computed(() => {
  return [...new Set(errorLogs.value.map(e => e.component))]
})

const filteredErrors = computed(() => {
  return errorLogs.value.filter(error => {
    if (filters.value.level && error.level !== filters.value.level) return false
    if (filters.value.status && error.status !== filters.value.status) return false
    if (filters.value.component && error.component !== filters.value.component) return false
    if (filters.value.search && !error.message.toLowerCase().includes(filters.value.search.toLowerCase())) return false
    return true
  })
})

// Helpers
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

// Load errors
const loadErrors = async () => {
  isLoading.value = true
  try {
    // ✅ MIGRATED TO API
    const { data: { user: sessionUser }, error: sessionError } = await $fetch('/api/auth/manage', { method: 'POST', body: { action: 'get-session', access_token: authStore.session?.access_token } }); const session = sessionUser ? { user: sessionUser } : null

    if (!session?.user) {
      console.error('No session found')
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', session.user.id)
      .single()

    if (!userProfile) return

    const timeRangeStart = getTimeRangeQuery(filters.value.timeRange)

    // Load errors
    if (userProfile.role === 'super_admin') {
      const response = await $fetch('/api/admin/error-logs-debug')
      if (response.data) {
        errorLogs.value = response.data
        totalErrors.value = response.count || 0
      }
    }

    // Load trends
    const trendsResponse = await $fetch('/api/admin/error-trends')
    if (trendsResponse.trends) {
      trends.value = trendsResponse.trends
    }

    // Update stats
    await loadStats()
  } catch (error) {
    console.error('Error loading errors:', error)
  } finally {
    isLoading.value = false
  }
}

const loadStats = async () => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  stats.value = {
    todayErrors: errorLogs.value.filter(e => e.created_at >= todayStart).length,
    openErrors: errorLogs.value.filter(e => e.status === 'open').length,
    fixedErrors: errorLogs.value.filter(e => e.status === 'fixed').length,
    affectedUsers: new Set(errorLogs.value.filter(e => e.user_id).map(e => e.user_id)).size,
    errorRate: errorLogs.value.length > 0 
      ? Math.round((errorLogs.value.filter(e => e.level === 'error').length / errorLogs.value.length) * 100)
      : 0
  }
}

const groupErrors = async () => {
  isGrouping.value = true
  try {
    const response = await $fetch('/api/admin/error-group', { method: 'POST' })
    console.log('Errors grouped:', response)
    await loadErrors()
  } catch (error) {
    console.error('Error grouping:', error)
  } finally {
    isGrouping.value = false
  }
}

const updateErrorStatus = async (error: any) => {
  try {
    await $fetch('/api/admin/error-update-status', {
      method: 'POST',
      body: {
        errorId: error.id,
        status: error.status
      }
    })
  } catch (error) {
    console.error('Error updating status:', error)
  }
}

onMounted(() => {
  loadErrors()
})
</script>

<style scoped>
</style>
