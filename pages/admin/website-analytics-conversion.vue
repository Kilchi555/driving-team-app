<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">📊 Website Analytics & Conversion Funnel</h1>
      <p class="text-gray-600 mt-1 text-sm">Vollständige Sitzungs- und Conversion-Metriken</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600 mt-4">Daten werden geladen...</p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Date Range Selector -->
      <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <label class="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="d in [7, 14, 30, 90]"
            :key="d"
            @click="selectedDays = d"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors',
              selectedDays === d
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ d }} Tage
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-sm font-medium">👁️ Seitenaufrufe</div>
          <div class="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">{{ data.summary.totalPageViews.toLocaleString('de-CH') }}</div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-sm font-medium">🔓 Kostenrechner geöffnet</div>
          <div class="text-2xl sm:text-3xl font-bold text-green-600 mt-2">{{ data.calculatorMetrics.totalOpens.toLocaleString('de-CH') }}</div>
          <div v-if="data.calculatorMetrics.totalOpens > 0" class="text-xs text-gray-500 mt-1">
            {{ ((data.calculatorMetrics.totalOpens / data.summary.totalPageViews) * 100).toFixed(1) }}% der Besucher
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-sm font-medium">✉️ Eingereichte Leads</div>
          <div class="text-2xl sm:text-3xl font-bold text-purple-600 mt-2">{{ data.leads.total.toLocaleString('de-CH') }}</div>
          <div v-if="data.calculatorMetrics.totalSubmissions > 0" class="text-xs text-gray-500 mt-1">
            {{ data.calculatorMetrics.conversionRate }}% Umwandlung
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-sm font-medium">🎯 Konversionsrate</div>
          <div class="text-2xl sm:text-3xl font-bold text-orange-600 mt-2">
            {{ data.calculatorMetrics.totalOpens > 0
              ? ((data.leads.total / data.calculatorMetrics.totalOpens) * 100).toFixed(1)
              : 0 }}%
          </div>
          <div class="text-xs text-gray-500 mt-1">Leads / Calc Opens</div>
        </div>
      </div>

      <!-- Funnel Visualization -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 class="text-lg font-bold text-gray-900 mb-4">📈 Conversion Funnel</h2>
        <div class="space-y-3">
          <!-- Level 1: Page Views -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">1️⃣ Website Besuche</span>
              <span class="font-bold text-blue-600">{{ data.summary.totalPageViews }}</span>
            </div>
            <div class="h-8 bg-blue-100 rounded-lg flex items-center px-3">
              <div class="h-6 bg-blue-600 rounded" :style="{ width: '100%' }"></div>
              <span class="ml-2 text-sm font-medium text-white">100%</span>
            </div>
          </div>

          <!-- Level 2: Calculator Opens -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">2️⃣ Kostenrechner geöffnet</span>
              <span class="font-bold text-green-600">{{ data.calculatorMetrics.totalOpens }}</span>
            </div>
            <div class="h-8 bg-green-100 rounded-lg flex items-center px-3">
              <div
                class="h-6 bg-green-600 rounded"
                :style="{ width: data.summary.totalPageViews > 0 ? ((data.calculatorMetrics.totalOpens / data.summary.totalPageViews) * 100) + '%' : '0%' }"
              ></div>
              <span class="ml-2 text-sm font-medium text-white">
                {{ data.summary.totalPageViews > 0 ? ((data.calculatorMetrics.totalOpens / data.summary.totalPageViews) * 100).toFixed(1) : 0 }}%
              </span>
            </div>
          </div>

          <!-- Level 3: Calculator Submitted -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">3️⃣ Kostenrechner eingereicht</span>
              <span class="font-bold text-orange-600">{{ data.calculatorMetrics.totalSubmissions }}</span>
            </div>
            <div class="h-8 bg-orange-100 rounded-lg flex items-center px-3">
              <div
                class="h-6 bg-orange-600 rounded"
                :style="{ width: data.calculatorMetrics.totalOpens > 0 ? ((data.calculatorMetrics.totalSubmissions / data.calculatorMetrics.totalOpens) * 100) + '%' : '0%' }"
              ></div>
              <span class="ml-2 text-sm font-medium text-white">
                {{ data.calculatorMetrics.totalOpens > 0 ? ((data.calculatorMetrics.totalSubmissions / data.calculatorMetrics.totalOpens) * 100).toFixed(1) : 0 }}%
              </span>
            </div>
          </div>

          <!-- Level 4: Leads -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">4️⃣ Leads generiert</span>
              <span class="font-bold text-purple-600">{{ data.leads.total }}</span>
            </div>
            <div class="h-8 bg-purple-100 rounded-lg flex items-center px-3">
              <div
                class="h-6 bg-purple-600 rounded"
                :style="{ width: data.calculatorMetrics.totalSubmissions > 0 ? ((data.leads.total / data.calculatorMetrics.totalSubmissions) * 100) + '%' : '0%' }"
              ></div>
              <span class="ml-2 text-sm font-medium text-white">
                {{ data.calculatorMetrics.totalSubmissions > 0 ? ((data.leads.total / data.calculatorMetrics.totalSubmissions) * 100).toFixed(1) : 0 }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Drop-off Analysis -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">🔴 Drop-off Analyse</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div class="bg-red-50 rounded-lg p-3 border border-red-200">
              <div class="text-red-600 font-medium">
                {{ (data.summary.totalPageViews - data.calculatorMetrics.totalOpens).toLocaleString('de-CH') }}
              </div>
              <div class="text-gray-600 text-xs mt-1">Besucher öffnen nicht den Kostenrechner</div>
              <div class="text-red-600 text-xs font-semibold mt-1">
                {{ ((1 - data.calculatorMetrics.totalOpens / data.summary.totalPageViews) * 100).toFixed(1) }}% Verlust
              </div>
            </div>

            <div class="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div class="text-orange-600 font-medium">
                {{ (data.calculatorMetrics.totalOpens - data.calculatorMetrics.totalSubmissions).toLocaleString('de-CH') }}
              </div>
              <div class="text-gray-600 text-xs mt-1">Öffnen, reichen aber nicht ein</div>
              <div class="text-orange-600 text-xs font-semibold mt-1">
                {{ data.calculatorMetrics.totalOpens > 0 ? ((1 - data.calculatorMetrics.totalSubmissions / data.calculatorMetrics.totalOpens) * 100).toFixed(1) : 0 }}% Verlust
              </div>
            </div>

            <div class="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div class="text-purple-600 font-medium">
                {{ (data.calculatorMetrics.totalSubmissions - data.leads.total).toLocaleString('de-CH') }}
              </div>
              <div class="text-gray-600 text-xs mt-1">E-Mail eingereicht, aber kein Lead</div>
              <div class="text-purple-600 text-xs font-semibold mt-1">
                {{ data.calculatorMetrics.totalSubmissions > 0 ? ((1 - data.leads.total / data.calculatorMetrics.totalSubmissions) * 100).toFixed(1) : 0 }}% Verlust
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Trend Chart (CSS-based) -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 class="text-lg font-bold text-gray-900 mb-4">📅 Tägliche Seitenaufrufe</h2>
        <div class="overflow-x-auto">
          <div class="flex gap-2 align-flex-end h-40" style="min-width: 100%">
            <div
              v-for="(item, idx) in data.dailyTrend"
              :key="idx"
              class="flex-1 flex flex-col items-center justify-end gap-2 group"
            >
              <div
                class="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer relative group"
                :style="{ height: maxViewCount > 0 ? ((item.views / maxViewCount) * 100) + '%' : '0%' }"
              >
                <div
                  class="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {{ item.views }} views
                </div>
              </div>
              <div class="text-xs text-gray-600 transform -rotate-45 origin-left whitespace-nowrap">
                {{ formatDate(item.date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Pages Table -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 class="text-lg font-bold text-gray-900 mb-4">🏆 Top Seiten</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-2 px-3 font-semibold text-gray-700">Seite</th>
                <th class="text-right py-2 px-3 font-semibold text-gray-700">Aufrufe</th>
                <th class="text-right py-2 px-3 font-semibold text-gray-700">Anteil</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(page, idx) in data.topPages" :key="idx" class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-3 text-gray-900 font-medium truncate">{{ page.page }}</td>
                <td class="py-3 px-3 text-right text-gray-600">{{ page.views.toLocaleString('de-CH') }}</td>
                <td class="py-3 px-3 text-right">
                  <div class="w-16 h-6 bg-gray-100 rounded relative ml-auto">
                    <div
                      class="h-full bg-blue-600 rounded"
                      :style="{ width: data.summary.totalPageViews > 0 ? ((page.views / data.summary.totalPageViews) * 100) + '%' : '0%' }"
                    ></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Leads by Category -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Calculator Opens by Category -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-900 mb-4">🚗 Kostenrechner nach Kategorie</h2>
          <div v-if="Object.keys(data.calculatorMetrics.byCategory).length === 0" class="text-center py-8 text-gray-500">
            Keine Daten verfügbar
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(count, category) in sortedCalcByCategory"
              :key="category"
              class="flex items-center gap-3"
            >
              <div class="text-sm font-medium text-gray-700 w-24">{{ category }}</div>
              <div class="flex-1 h-6 bg-green-100 rounded flex items-center px-2">
                <div
                  class="h-4 bg-green-600 rounded"
                  :style="{ width: (count / maxCalcOpens * 100) + '%' }"
                ></div>
              </div>
              <div class="text-sm font-semibold text-gray-900 w-12 text-right">{{ count }}</div>
            </div>
          </div>
        </div>

        <!-- Leads by Category -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-900 mb-4">💼 Leads nach Kategorie</h2>
          <div v-if="Object.keys(data.leads.byCategory).length === 0" class="text-center py-8 text-gray-500">
            Keine Daten verfügbar
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(count, category) in sortedLeadsByCategory"
              :key="category"
              class="flex items-center gap-3"
            >
              <div class="text-sm font-medium text-gray-700 w-24">{{ category }}</div>
              <div class="flex-1 h-6 bg-purple-100 rounded flex items-center px-2">
                <div
                  class="h-4 bg-purple-600 rounded"
                  :style="{ width: (count / maxLeads * 100) + '%' }"
                ></div>
              </div>
              <div class="text-sm font-semibold text-gray-900 w-12 text-right">{{ count }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  middleware: 'admin',
})

interface AnalyticsData {
  summary: {
    totalPageViews: number
    calculatorOpens: number
    calculatorSubmissions: number
    totalLeads: number
    avgLeadsPerSession: number
  }
  dailyTrend: Array<{ date: string; views: number }>
  topPages: Array<{ page: string; views: number }>
  calculatorMetrics: {
    totalOpens: number
    totalSubmissions: number
    conversionRate: string | number
    byCategory: Record<string, number>
  }
  leads: {
    total: number
    byCategory: Record<string, number>
  }
  funnelSessions: any[]
}

const data = ref<AnalyticsData>({
  summary: {
    totalPageViews: 0,
    calculatorOpens: 0,
    calculatorSubmissions: 0,
    totalLeads: 0,
    avgLeadsPerSession: 0,
  },
  dailyTrend: [],
  topPages: [],
  calculatorMetrics: {
    totalOpens: 0,
    totalSubmissions: 0,
    conversionRate: 0,
    byCategory: {},
  },
  leads: {
    total: 0,
    byCategory: {},
  },
  funnelSessions: [],
})

const isLoading = ref(false)
const selectedDays = ref(7)

onMounted(() => {
  loadData()
})

const loadData = async () => {
  isLoading.value = true
  try {
    const response = await $fetch('/api/admin/website-analytics-conversion', {
      query: { days: selectedDays.value },
    })
    data.value = response
  } catch (err) {
    console.error('Error loading analytics:', err)
  } finally {
    isLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-CH', { month: 'short', day: 'numeric' })
}

const maxViewCount = computed(() => {
  return Math.max(...data.value.dailyTrend.map((item) => item.views), 1)
})

const maxCalcOpens = computed(() => {
  return Math.max(...Object.values(data.value.calculatorMetrics.byCategory), 1)
})

const maxLeads = computed(() => {
  return Math.max(...Object.values(data.value.leads.byCategory), 1)
})

const sortedCalcByCategory = computed(() => {
  return Object.fromEntries(
    Object.entries(data.value.calculatorMetrics.byCategory).sort(([, a], [, b]) => (b as number) - (a as number))
  )
})

const sortedLeadsByCategory = computed(() => {
  return Object.fromEntries(
    Object.entries(data.value.leads.byCategory).sort(([, a], [, b]) => (b as number) - (a as number))
  )
})

watch(selectedDays, () => {
  loadData()
})
</script>
