<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">📊 Website Analytics & Conversion Funnel</h1>
      <p class="text-gray-600 mt-1 text-sm">Vollständige Sitzungs- und Conversion-Metriken von drivingteam.ch bis zur Buchung</p>
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
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-xs font-medium">👁️ Seitenaufrufe</div>
          <div class="text-2xl font-bold text-blue-600 mt-2">{{ data.summary.totalPageViews.toLocaleString('de-CH') }}</div>
          <div class="text-xs text-gray-400 mt-1">Unique Sessions: {{ uniqueSessions }}</div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-xs font-medium">🧮 Calc geöffnet</div>
          <div class="text-2xl font-bold text-green-600 mt-2">{{ data.calculatorMetrics.totalOpens.toLocaleString('de-CH') }}</div>
          <div class="text-xs text-gray-400 mt-1">
            {{ data.summary.totalPageViews > 0 ? ((data.calculatorMetrics.totalOpens / data.summary.totalPageViews) * 100).toFixed(1) : 0 }}% der Besucher
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-xs font-medium">✉️ Leads erhalten</div>
          <div class="text-2xl font-bold text-purple-600 mt-2">{{ data.leads.total.toLocaleString('de-CH') }}</div>
          <div class="text-xs text-gray-400 mt-1">
            {{ data.calculatorMetrics.totalOpens > 0 ? ((data.leads.total / data.calculatorMetrics.totalOpens) * 100).toFixed(1) : 0 }}% Conv. Rate
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="text-gray-600 text-xs font-medium">📅 Buchungen gestartet</div>
          <div class="text-2xl font-bold text-indigo-600 mt-2">{{ data.bookingEvents.viewed.toLocaleString('de-CH') }}</div>
          <div class="text-xs text-gray-400 mt-1">
            {{ data.leads.total > 0 ? ((data.bookingEvents.viewed / data.leads.total) * 100).toFixed(1) : 0 }}% nach Lead
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-green-200 bg-green-50">
          <div class="text-green-700 text-xs font-medium">✅ Buchungen abgeschlossen</div>
          <div class="text-2xl font-bold text-green-700 mt-2">{{ data.bookingEvents.completed.toLocaleString('de-CH') }}</div>
          <div class="text-xs text-green-600 mt-1">
            {{ data.summary.totalPageViews > 0 ? ((data.bookingEvents.completed / data.summary.totalPageViews) * 100).toFixed(2) : 0 }}% End-zu-End Rate
          </div>
        </div>
      </div>

      <!-- Funnel Visualization -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 class="text-lg font-bold text-gray-900 mb-4">📈 Vollständiger Conversion Funnel</h2>
        <div class="space-y-3">
          <!-- Level 1: Page Views -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">1️⃣ Website Besuche (drivingteam.ch)</span>
              <span class="font-bold text-blue-600">{{ data.summary.totalPageViews }}</span>
            </div>
            <div class="h-8 bg-blue-100 rounded-lg overflow-hidden">
              <div class="h-full bg-blue-600 flex items-center px-3" style="width: 100%">
                <span class="text-xs font-medium text-white">100%</span>
              </div>
            </div>
          </div>

          <!-- Level 2: Calculator Opens -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">2️⃣ Kostenrechner geöffnet</span>
              <span class="font-bold text-green-600">{{ data.calculatorMetrics.totalOpens }}</span>
            </div>
            <div class="h-8 bg-green-100 rounded-lg overflow-hidden">
              <div
                class="h-full bg-green-600 flex items-center px-3"
                :style="{ width: funnelWidth(data.calculatorMetrics.totalOpens, data.summary.totalPageViews) }"
              >
                <span class="text-xs font-medium text-white">{{ funnelPct(data.calculatorMetrics.totalOpens, data.summary.totalPageViews) }}</span>
              </div>
            </div>
          </div>

          <!-- Level 3: Calculator Submitted -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">3️⃣ Kostenrechner eingereicht</span>
              <span class="font-bold text-yellow-600">{{ data.calculatorMetrics.totalSubmissions }}</span>
            </div>
            <div class="h-8 bg-yellow-100 rounded-lg overflow-hidden">
              <div
                class="h-full bg-yellow-500 flex items-center px-3"
                :style="{ width: funnelWidth(data.calculatorMetrics.totalSubmissions, data.summary.totalPageViews) }"
              >
                <span class="text-xs font-medium text-white">{{ funnelPct(data.calculatorMetrics.totalSubmissions, data.summary.totalPageViews) }}</span>
              </div>
            </div>
          </div>

          <!-- Level 4: Leads -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">4️⃣ Leads generiert (Email erhalten)</span>
              <span class="font-bold text-purple-600">{{ data.leads.total }}</span>
            </div>
            <div class="h-8 bg-purple-100 rounded-lg overflow-hidden">
              <div
                class="h-full bg-purple-600 flex items-center px-3"
                :style="{ width: funnelWidth(data.leads.total, data.summary.totalPageViews) }"
              >
                <span class="text-xs font-medium text-white">{{ funnelPct(data.leads.total, data.summary.totalPageViews) }}</span>
              </div>
            </div>
          </div>

          <!-- Level 5: Booking Viewed -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">5️⃣ Buchungsseite besucht (simy.ch)</span>
              <span class="font-bold text-indigo-600">{{ data.bookingEvents.viewed }}</span>
            </div>
            <div class="h-8 bg-indigo-100 rounded-lg overflow-hidden">
              <div
                class="h-full bg-indigo-500 flex items-center px-3"
                :style="{ width: funnelWidth(data.bookingEvents.viewed, data.summary.totalPageViews) }"
              >
                <span class="text-xs font-medium text-white">{{ funnelPct(data.bookingEvents.viewed, data.summary.totalPageViews) }}</span>
              </div>
            </div>
          </div>

          <!-- Level 6: Booking Completed -->
          <div class="space-y-1">
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-700">6️⃣ Buchung abgeschlossen ✅</span>
              <span class="font-bold text-green-700">{{ data.bookingEvents.completed }}</span>
            </div>
            <div class="h-8 bg-green-100 rounded-lg overflow-hidden">
              <div
                class="h-full bg-green-700 flex items-center px-3"
                :style="{ width: funnelWidth(data.bookingEvents.completed, data.summary.totalPageViews) }"
              >
                <span class="text-xs font-medium text-white">{{ funnelPct(data.bookingEvents.completed, data.summary.totalPageViews) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Drop-off Analysis -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">🔴 Drop-off Analyse</h3>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <div class="bg-red-50 rounded-lg p-3 border border-red-200">
              <div class="text-red-600 font-bold text-lg">{{ (data.summary.totalPageViews - data.calculatorMetrics.totalOpens).toLocaleString('de-CH') }}</div>
              <div class="text-gray-600 text-xs mt-1">Öffnen Calc nicht</div>
              <div class="text-red-600 text-xs font-semibold mt-1">{{ dropoffPct(data.summary.totalPageViews, data.calculatorMetrics.totalOpens) }}% Verlust</div>
            </div>
            <div class="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div class="text-orange-600 font-bold text-lg">{{ (data.calculatorMetrics.totalOpens - data.calculatorMetrics.totalSubmissions).toLocaleString('de-CH') }}</div>
              <div class="text-gray-600 text-xs mt-1">Reichen nicht ein</div>
              <div class="text-orange-600 text-xs font-semibold mt-1">{{ dropoffPct(data.calculatorMetrics.totalOpens, data.calculatorMetrics.totalSubmissions) }}% Verlust</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div class="text-purple-600 font-bold text-lg">{{ (data.calculatorMetrics.totalSubmissions - data.leads.total).toLocaleString('de-CH') }}</div>
              <div class="text-gray-600 text-xs mt-1">Kein Lead nach Submit</div>
              <div class="text-purple-600 text-xs font-semibold mt-1">{{ dropoffPct(data.calculatorMetrics.totalSubmissions, data.leads.total) }}% Verlust</div>
            </div>
            <div class="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <div class="text-indigo-600 font-bold text-lg">{{ (data.leads.total - data.bookingEvents.viewed).toLocaleString('de-CH') }}</div>
              <div class="text-gray-600 text-xs mt-1">Klicken Buchung nicht</div>
              <div class="text-indigo-600 text-xs font-semibold mt-1">{{ dropoffPct(data.leads.total, data.bookingEvents.viewed) }}% Verlust</div>
            </div>
            <div class="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div class="text-yellow-600 font-bold text-lg">{{ (data.bookingEvents.viewed - data.bookingEvents.completed).toLocaleString('de-CH') }}</div>
              <div class="text-gray-600 text-xs mt-1">Buchung abgebrochen</div>
              <div class="text-yellow-600 text-xs font-semibold mt-1">{{ dropoffPct(data.bookingEvents.viewed, data.bookingEvents.completed) }}% Verlust</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Trend Chart -->
      <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 class="text-lg font-bold text-gray-900 mb-4">📅 Tägliche Seitenaufrufe</h2>
        <div class="overflow-x-auto">
          <div class="flex gap-1 items-end h-40 pb-6" style="min-width: 100%">
            <div
              v-for="(item, idx) in data.dailyTrend"
              :key="idx"
              class="flex-1 flex flex-col items-center justify-end group relative"
            >
              <div
                class="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer"
                :style="{ height: maxViewCount > 0 ? ((item.views / maxViewCount) * 120) + 'px' : '2px' }"
              >
                <div class="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {{ item.views }} views
                </div>
              </div>
              <div class="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left whitespace-nowrap" style="font-size: 9px">
                {{ formatDate(item.date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Pages + Booking Abandoned -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Pages -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-900 mb-4">🏆 Top Seiten</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="text-left py-2 px-2 font-semibold text-gray-700">Seite</th>
                  <th class="text-right py-2 px-2 font-semibold text-gray-700">Views</th>
                  <th class="text-right py-2 px-2 font-semibold text-gray-700">Anteil</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(page, idx) in data.topPages" :key="idx" class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-2 px-2 text-gray-900 font-medium truncate max-w-xs">{{ page.page }}</td>
                  <td class="py-2 px-2 text-right text-gray-600">{{ page.views.toLocaleString('de-CH') }}</td>
                  <td class="py-2 px-2 text-right w-20">
                    <div class="w-full h-4 bg-gray-100 rounded">
                      <div
                        class="h-full bg-blue-500 rounded"
                        :style="{ width: data.summary.totalPageViews > 0 ? ((page.views / data.summary.totalPageViews) * 100) + '%' : '0%' }"
                      ></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Booking Stats -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-900 mb-4">📅 Buchungs-Statistiken (simy.ch)</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span class="text-sm font-medium text-indigo-800">Buchungsseite besucht</span>
              <span class="font-bold text-indigo-700 text-lg">{{ data.bookingEvents.viewed }}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span class="text-sm font-medium text-green-800">✅ Buchung abgeschlossen</span>
              <span class="font-bold text-green-700 text-lg">{{ data.bookingEvents.completed }}</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span class="text-sm font-medium text-red-800">❌ Buchung abgebrochen</span>
              <span class="font-bold text-red-700 text-lg">{{ data.bookingEvents.abandoned }}</span>
            </div>
            <div class="pt-2 border-t border-gray-200">
              <div class="flex justify-between text-sm text-gray-700">
                <span>Buchungs-Conv. Rate</span>
                <span class="font-bold text-green-700">
                  {{ data.bookingEvents.viewed > 0 ? ((data.bookingEvents.completed / data.bookingEvents.viewed) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
              <div class="flex justify-between text-sm text-gray-700 mt-1">
                <span>End-zu-End Rate (Views → Booking)</span>
                <span class="font-bold text-blue-700">
                  {{ data.summary.totalPageViews > 0 ? ((data.bookingEvents.completed / data.summary.totalPageViews) * 100).toFixed(2) : 0 }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Breakdowns -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Calculator by Category -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-900 mb-4">🚗 Kostenrechner nach Kategorie</h2>
          <div v-if="Object.keys(data.calculatorMetrics.byCategory).length === 0" class="text-center py-8 text-gray-500 text-sm">
            Keine Daten verfügbar
          </div>
          <div v-else class="space-y-2">
            <div v-for="(count, category) in sortedCalcByCategory" :key="category" class="flex items-center gap-3">
              <div class="text-sm font-medium text-gray-700 w-24 truncate">{{ category }}</div>
              <div class="flex-1 h-6 bg-green-100 rounded overflow-hidden">
                <div class="h-full bg-green-600 flex items-center px-2" :style="{ width: (count / maxCalcOpens * 100) + '%' }">
                </div>
              </div>
              <div class="text-sm font-semibold text-gray-900 w-8 text-right">{{ count }}</div>
            </div>
          </div>
        </div>

        <!-- Leads by Category -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-900 mb-4">💼 Leads nach Kategorie</h2>
          <div v-if="Object.keys(data.leads.byCategory).length === 0" class="text-center py-8 text-gray-500 text-sm">
            Keine Daten verfügbar
          </div>
          <div v-else class="space-y-2">
            <div v-for="(count, category) in sortedLeadsByCategory" :key="category" class="flex items-center gap-3">
              <div class="text-sm font-medium text-gray-700 w-24 truncate">{{ category }}</div>
              <div class="flex-1 h-6 bg-purple-100 rounded overflow-hidden">
                <div class="h-full bg-purple-600" :style="{ width: (count / maxLeads * 100) + '%' }"></div>
              </div>
              <div class="text-sm font-semibold text-gray-900 w-8 text-right">{{ count }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

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
  bookingEvents: {
    viewed: number
    completed: number
    abandoned: number
  }
  bookingRedirects: {
    total: number
    byCategory: Record<string, number>
  }
  funnelSessions: any[]
}

const data = ref<AnalyticsData>({
  summary: { totalPageViews: 0, calculatorOpens: 0, calculatorSubmissions: 0, totalLeads: 0, avgLeadsPerSession: 0 },
  dailyTrend: [],
  topPages: [],
  calculatorMetrics: { totalOpens: 0, totalSubmissions: 0, conversionRate: 0, byCategory: {} },
  leads: { total: 0, byCategory: {} },
  bookingEvents: { viewed: 0, completed: 0, abandoned: 0 },
  bookingRedirects: { total: 0, byCategory: {} },
  funnelSessions: [],
})

const isLoading = ref(false)
const selectedDays = ref(7)

onMounted(() => loadData())

const loadData = async () => {
  isLoading.value = true
  try {
    const response = await $fetch<AnalyticsData>('/api/admin/website-analytics-conversion', {
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

const funnelWidth = (value: number, base: number) => {
  if (!base || !value) return '2px'
  const pct = Math.min((value / base) * 100, 100)
  return pct < 2 ? '2%' : pct + '%'
}

const funnelPct = (value: number, base: number) => {
  if (!base || !value) return '0%'
  return ((value / base) * 100).toFixed(1) + '%'
}

const dropoffPct = (from: number, to: number) => {
  if (!from) return '0'
  return ((1 - to / from) * 100).toFixed(1)
}

const uniqueSessions = computed(() => {
  const sessions = new Set(data.value.topPages.map((_, i) => i))
  return data.value.topPages.length
})

const maxViewCount = computed(() => Math.max(...data.value.dailyTrend.map(i => i.views), 1))
const maxCalcOpens = computed(() => Math.max(...Object.values(data.value.calculatorMetrics.byCategory) as number[], 1))
const maxLeads = computed(() => Math.max(...Object.values(data.value.leads.byCategory) as number[], 1))

const sortedCalcByCategory = computed(() =>
  Object.fromEntries(Object.entries(data.value.calculatorMetrics.byCategory).sort(([, a], [, b]) => (b as number) - (a as number)))
)

const sortedLeadsByCategory = computed(() =>
  Object.fromEntries(Object.entries(data.value.leads.byCategory).sort(([, a], [, b]) => (b as number) - (a as number)))
)

watch(selectedDays, () => loadData())
</script>
