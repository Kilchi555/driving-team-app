<!-- components/admin/ErrorLogsViewer.vue -->
<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Error Logs</h2>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
        <select
          v-model="selectedHours"
          @change="fetchLogs"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option :value="1">Last 1 hour</option>
          <option :value="6">Last 6 hours</option>
          <option :value="24">Last 24 hours</option>
          <option :value="168">Last 7 days</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Component</label>
        <select
          v-model="selectedComponent"
          @change="fetchLogs"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Components</option>
          <option v-for="comp in uniqueComponents" :key="comp" :value="comp">
            {{ comp }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Limit</label>
        <select
          v-model="selectedLimit"
          @change="fetchLogs"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option :value="50">50 logs</option>
          <option :value="100">100 logs</option>
          <option :value="500">500 logs</option>
        </select>
      </div>

      <div class="flex items-end">
        <button
          @click="fetchLogs"
          :disabled="loading"
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <span v-if="loading">Loading...</span>
          <span v-else>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Statistics -->
    <div v-if="statistics" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="text-3xl font-bold text-red-600">{{ statistics.totalErrors }}</div>
        <div class="text-sm text-gray-600">Total Errors</div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="text-3xl font-bold text-blue-600">{{ Object.keys(statistics.byComponent).length }}</div>
        <div class="text-sm text-gray-600">Unique Components</div>
      </div>

      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="text-sm text-gray-600">Timeframe</div>
        <div class="text-lg font-semibold text-gray-900">{{ statistics.timeRange }}</div>
      </div>
    </div>

    <!-- Error List -->
    <div v-if="!loading && errorLogs.length > 0" class="space-y-3">
      <div
        v-for="log in errorLogs"
        :key="log.id"
        class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
        @click="selectedLog = selectedLog?.id === log.id ? null : log"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                ERROR
              </span>
              <span class="font-semibold text-gray-900">{{ log.component }}</span>
            </div>
            <p class="text-gray-700">{{ log.message }}</p>
            <div class="flex gap-4 mt-2 text-xs text-gray-500">
              <span>{{ formatDate(log.created_at) }}</span>
              <span v-if="log.user_id">User: {{ log.user_id.substring(0, 8) }}</span>
              <span v-if="log.url">{{ new URL(log.url).pathname }}</span>
            </div>
          </div>
          <div class="text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        <!-- Expanded details -->
        <div v-if="selectedLog?.id === log.id" class="mt-4 pt-4 border-t border-gray-200">
          <div v-if="log.data" class="mb-4">
            <h4 class="font-semibold text-gray-900 mb-2">Error Details</h4>
            <pre class="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>

          <div v-if="log.user_agent" class="text-xs text-gray-600">
            <strong>Browser:</strong> {{ log.user_agent }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="text-center py-8">
      <p class="text-gray-500">No errors found in this timeframe</p>
    </div>

    <!-- Loading -->
    <div v-else class="text-center py-8">
      <p class="text-gray-500">Loading...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useErrorLogs } from '~/composables/useErrorLogs'
import { logger } from '~/utils/logger'

// State
const selectedHours = ref(24)
const selectedComponent = ref('')
const selectedLimit = ref(100)
const selectedLog = ref(null)

// Use composable
const { errorLogs, loading, fetchErrorLogs, getStatistics } = useErrorLogs()
const statistics = ref(null)

// Computed
const uniqueComponents = computed(() => {
  return [...new Set(errorLogs.value.map((log: any) => log.component))]
})

// Methods
const fetchLogs = async () => {
  try {
    await fetchErrorLogs({
      hours: selectedHours.value,
      component: selectedComponent.value || undefined,
      limit: selectedLimit.value
    })

    statistics.value = await getStatistics(selectedHours.value)
    logger.debug('ErrorLogsViewer', 'Logs fetched successfully', {
      count: errorLogs.value.length
    })
  } catch (error) {
    logger.error('ErrorLogsViewer', 'Failed to fetch logs', error)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Load logs on mount
onMounted(() => {
  fetchLogs()
})
</script>

