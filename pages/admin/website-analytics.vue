<template>
  <div class="p-2 sm:p-4 space-y-4 sm:space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-lg sm:text-xl font-bold text-gray-900">🌐 Website Analytics</h1>
        <p class="text-xs text-gray-500 mt-0.5">Anonyme Besucherstatistiken – keine Cookies, kein Einverständnis nötig</p>
      </div>
      <div class="flex gap-2">
        <button
          v-for="d in [7, 30, 90]" :key="d"
          @click="setDays(d)"
          :class="days === d ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
        >
          {{ d }}d
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="text-center text-gray-400">
        <div class="text-3xl mb-2">📊</div>
        <p class="text-sm">Daten werden geladen...</p>
      </div>
    </div>

    <template v-else>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white rounded-lg border shadow-sm p-3 sm:p-4">
          <div class="text-xs text-gray-500 mb-1">Seitenaufrufe total</div>
          <div class="text-2xl font-bold text-gray-900">{{ data?.totalViews?.toLocaleString('de-CH') ?? 0 }}</div>
          <div class="text-xs text-gray-400 mt-1">letzte {{ days }} Tage</div>
        </div>
        <div class="bg-white rounded-lg border shadow-sm p-3 sm:p-4">
          <div class="text-xs text-gray-500 mb-1">Ø pro Tag</div>
          <div class="text-2xl font-bold text-gray-900">{{ avgPerDay }}</div>
          <div class="text-xs text-gray-400 mt-1">Aufrufe / Tag</div>
        </div>
        <div class="bg-white rounded-lg border shadow-sm p-3 sm:p-4">
          <div class="text-xs text-gray-500 mb-1">Suchmaschinen</div>
          <div class="text-2xl font-bold text-green-600">{{ searchPct }}%</div>
          <div class="text-xs text-gray-400 mt-1">organischer Traffic</div>
        </div>
        <div class="bg-white rounded-lg border shadow-sm p-3 sm:p-4">
          <div class="text-xs text-gray-500 mb-1">Mobile</div>
          <div class="text-2xl font-bold text-blue-600">{{ mobilePct }}%</div>
          <div class="text-xs text-gray-400 mt-1">der Besucher</div>
        </div>
      </div>

      <!-- Daily Trend + Sources -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Daily Trend -->
        <div class="lg:col-span-2 bg-white rounded-lg border shadow-sm p-4">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">📈 Verlauf letzte {{ days }} Tage</h3>
          <div class="flex items-end gap-0.5 h-24">
            <div
              v-for="day in data?.daily" :key="day.date"
              class="flex-1 bg-primary-500 rounded-t hover:bg-primary-400 transition cursor-default group relative"
              :style="{ height: `${maxDaily > 0 ? (day.views / maxDaily) * 100 : 0}%`, minHeight: '2px' }"
            >
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {{ formatDate(day.date) }}: {{ day.views }}
              </div>
            </div>
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>{{ data?.daily?.[0]?.date ?? '' }}</span>
            <span>{{ data?.daily?.[data.daily.length - 1]?.date ?? '' }}</span>
          </div>
        </div>

        <!-- Traffic Sources -->
        <div class="bg-white rounded-lg border shadow-sm p-4">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">🔍 Traffic-Quellen</h3>
          <div class="space-y-3">
            <div v-for="source in sourceList" :key="source.key" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-700">{{ source.label }}</span>
                <span class="font-semibold text-gray-900">{{ source.views }} <span class="text-gray-400 font-normal">({{ source.pct }}%)</span></span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" :class="source.color" :style="{ width: source.pct + '%' }"></div>
              </div>
            </div>
          </div>

          <h3 class="text-sm font-semibold text-gray-900 mt-5 mb-4">📱 Geräte</h3>
          <div class="space-y-3">
            <div v-for="device in deviceList" :key="device.key" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-700">{{ device.label }}</span>
                <span class="font-semibold text-gray-900">{{ device.views }} <span class="text-gray-400 font-normal">({{ device.pct }}%)</span></span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-400 rounded-full transition-all" :style="{ width: device.pct + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Pages -->
      <div class="bg-white rounded-lg border shadow-sm">
        <div class="px-4 py-3 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900">🏆 Top Seiten (letzte {{ days }} Tage)</h3>
        </div>
        <div class="divide-y divide-gray-50">
          <div
            v-for="(page, i) in data?.topPages"
            :key="page.page"
            class="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition"
          >
            <span class="text-xs text-gray-400 w-5 text-right font-mono">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <a :href="`https://drivingteam.ch${page.page}`" target="_blank" class="text-sm text-primary-600 hover:underline truncate block">
                {{ page.page }}
              </a>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <div class="h-1.5 w-16 sm:w-24 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-400 rounded-full"
                  :style="{ width: `${maxPage > 0 ? (page.views / maxPage) * 100 : 0}%` }"
                ></div>
              </div>
              <span class="text-sm font-semibold text-gray-900 w-10 text-right">{{ page.views }}</span>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin', layout: 'admin' })

interface AnalyticsData {
  totalViews: number
  topPages: { page: string; views: number }[]
  sources: Record<string, number>
  devices: Record<string, number>
  daily: { date: string; views: number }[]
}

const days = ref(30)
const data = ref<AnalyticsData | null>(null)
const isLoading = ref(true)

async function load() {
  isLoading.value = true
  try {
    data.value = await $fetch<AnalyticsData>(`/api/admin/website-analytics?days=${days.value}`)
  } finally {
    isLoading.value = false
  }
}

function setDays(d: number) {
  days.value = d
  load()
}

onMounted(load)

const avgPerDay = computed(() => {
  if (!data.value?.totalViews || !days.value) return 0
  return Math.round(data.value.totalViews / days.value)
})

const maxDaily = computed(() => Math.max(...(data.value?.daily?.map(d => d.views) ?? [0])))
const maxPage = computed(() => data.value?.topPages?.[0]?.views ?? 1)

const totalSourceViews = computed(() => Object.values(data.value?.sources ?? {}).reduce((a, b) => a + b, 0))

const searchPct = computed(() => {
  const v = totalSourceViews.value
  if (!v) return 0
  return Math.round(((data.value?.sources?.search ?? 0) / v) * 100)
})

const mobilePct = computed(() => {
  const total = Object.values(data.value?.devices ?? {}).reduce((a, b) => a + b, 0)
  if (!total) return 0
  return Math.round(((data.value?.devices?.mobile ?? 0) / total) * 100)
})

const sourceList = computed(() => {
  const sources = data.value?.sources ?? {}
  const total = totalSourceViews.value || 1
  return [
    { key: 'search', label: '🔍 Suchmaschine', color: 'bg-green-400' },
    { key: 'direct', label: '🔗 Direkt', color: 'bg-blue-400' },
    { key: 'social', label: '📱 Social Media', color: 'bg-pink-400' },
    { key: 'other', label: '🌐 Andere', color: 'bg-gray-400' },
    { key: 'internal', label: '↩️ Intern', color: 'bg-yellow-400' },
  ]
    .filter(s => sources[s.key])
    .map(s => ({ ...s, views: sources[s.key] ?? 0, pct: Math.round(((sources[s.key] ?? 0) / total) * 100) }))
    .sort((a, b) => b.views - a.views)
})

const deviceList = computed(() => {
  const devices = data.value?.devices ?? {}
  const total = Object.values(devices).reduce((a, b) => a + b, 0) || 1
  return [
    { key: 'desktop', label: '🖥️ Desktop' },
    { key: 'mobile', label: '📱 Mobile' },
    { key: 'tablet', label: '📲 Tablet' },
  ]
    .filter(d => devices[d.key])
    .map(d => ({ ...d, views: devices[d.key] ?? 0, pct: Math.round(((devices[d.key] ?? 0) / total) * 100) }))
    .sort((a, b) => b.views - a.views)
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}
</script>
