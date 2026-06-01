<template>
  <div v-if="isLoading" class="flex items-center justify-center min-h-[100svh]">
    <LoadingLogo size="2xl" />
  </div>

  <div v-else-if="currentUser" class="min-h-[100svh] bg-gray-50" style="padding-top: env(safe-area-inset-top, 0px)">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="navigateTo('/dashboard')" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Marketing Dashboard</h1>
            <p class="text-xs text-gray-500">drivingteam.ch – GA4, Google Ads, Search Console</p>
          </div>
        </div>
        <!-- Date range selector -->
        <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            v-for="d in [7, 30, 90]"
            :key="d"
            @click="changeDays(d)"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            ]"
          >{{ d }}T</button>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">

      <!-- Weekly Review -->
      <div v-if="weeklyReview" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="font-bold text-gray-900">Wöchentliches Review</h2>
            <p class="text-xs text-gray-500 mt-0.5">KW {{ weeklyReview.week_number }} · {{ formatDate(weeklyReview.generated_at) }}</p>
          </div>
          <span class="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Automatisch</span>
        </div>
        <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top 5 Massnahmen</p>
            <ol class="space-y-2">
              <li v-for="(action, i) in weeklyReview.top_actions" :key="i" class="flex gap-3 items-start">
                <span class="shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white" :style="{ background: primaryColor }">{{ i + 1 }}</span>
                <span class="text-sm text-gray-700 leading-snug">{{ action }}</span>
              </li>
            </ol>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Low Hanging Fruits</p>
            <ul class="space-y-2">
              <li v-for="(fruit, i) in weeklyReview.low_hanging_fruits" :key="i" class="flex gap-3 items-start">
                <span class="shrink-0 w-2 h-2 rounded-full bg-amber-400 mt-2"></span>
                <span class="text-sm text-gray-700 leading-snug">{{ fruit }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div v-if="weeklyReview.summary" class="px-5 pb-4">
          <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{{ weeklyReview.summary }}</p>
        </div>
      </div>

      <!-- No review yet -->
      <div v-else class="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        Kein wöchentliches Review vorhanden. Der Cron Job läuft jeden Montag und erstellt automatisch ein Review.
      </div>

      <!-- KPI Cards -->
      <div v-if="data" class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Sessions</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ totalSessions.toLocaleString('de-CH') }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ days }} Tage</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Marketing-Conversions</p>
          <p class="text-2xl font-bold mt-1" :style="{ color: primaryColor }">{{ marketingConversions }}</p>
          <p class="text-xs text-gray-400 mt-0.5">CVR {{ marketingCvrFormatted }}% (exkl. Unassigned)</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Ads Spend</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">CHF {{ data.summary.googleSpend.toFixed(0) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ data.summary.totalAdClicks }} Klicks</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 font-medium">Buchungs-Rate</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ data.summary.bookingCompletionRate }}%</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ data.summary.completedBookings }} abgeschl.</p>
        </div>
      </div>

      <!-- Traffic by Channel + Conversion Funnel -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Channel Breakdown -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h3 class="font-semibold text-gray-800 mb-4 text-sm">Traffic nach Kanal</h3>
          <div class="space-y-3">
            <div v-for="ch in channelStats" :key="ch.channel" class="flex items-center gap-3">
              <div class="w-24 text-xs truncate shrink-0" :class="ch.isMarketing ? 'text-gray-600' : 'text-gray-400'">
                {{ ch.channel.replace('Organic ', '').replace('Paid ', 'Paid ') }}
              </div>
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all" :style="{ width: ch.pct + '%', background: ch.isMarketing ? primaryColor : '#d1d5db' }"></div>
              </div>
              <div class="text-xs font-semibold w-10 text-right" :class="ch.isMarketing ? 'text-gray-700' : 'text-gray-400'">{{ ch.sessions }}</div>
              <div class="text-xs w-12 text-right" :class="ch.isMarketing ? 'text-gray-500' : 'text-gray-300'">{{ ch.cvr }}%</div>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <div class="w-2 h-2 rounded-full shrink-0" :style="{ background: primaryColor }"></div>
            <p class="text-xs text-gray-400">Marketing-Kanäle · grau = bestehende Schüler / nicht zuordenbar</p>
          </div>
        </div>

        <!-- Booking Funnel -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h3 class="font-semibold text-gray-800 mb-4 text-sm">Buchungs-Funnel</h3>
          <div v-if="data" class="space-y-3">
            <div v-for="step in funnelSteps" :key="step.label" class="flex items-center gap-3">
              <div class="w-36 text-xs text-gray-600 shrink-0">{{ step.label }}</div>
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full" :style="{ width: step.pct + '%', background: step.color }"></div>
              </div>
              <div class="text-xs font-semibold text-gray-700 w-10 text-right">{{ step.value }}</div>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-4">Website → Buchungsapp → Abschluss</p>
        </div>
      </div>

      <!-- SEO Opportunities -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">SEO-Chancen: Keywords auf Position 4–15</h3>
          <p class="text-xs text-gray-500 mt-0.5">Diese Keywords stehen fast auf Seite 1. Mit kleinem Aufwand sind Top-3-Platzierungen möglich.</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="kw in seoOpportunities" :key="kw.query" class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ kw.query }}</p>
              <p class="text-xs text-gray-400 truncate">{{ kw.page }}</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ Number(kw.avg_pos).toFixed(1) }}</p>
              <p class="text-xs text-gray-400">Pos.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ kw.impressions }}</p>
              <p class="text-xs text-gray-400">Impr.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ kw.clicks }}</p>
              <p class="text-xs text-gray-400">Klicks</p>
            </div>
            <div class="shrink-0">
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full"
                :class="Number(kw.avg_pos) <= 8 ? 'bg-green-100 text-green-700' : Number(kw.avg_pos) <= 12 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'"
              >{{ Number(kw.avg_pos) <= 8 ? 'Hoch' : Number(kw.avg_pos) <= 12 ? 'Mittel' : 'Niedrig' }}</span>
            </div>
          </div>
          <div v-if="seoOpportunities.length === 0" class="px-5 py-6 text-center text-sm text-gray-400">Keine Daten — Cron Job noch nicht ausgeführt</div>
        </div>
      </div>

      <!-- Google Ads Campaigns -->
      <div v-if="data && data.googleAds.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800">Google Ads Kampagnen</h3>
          <p class="text-xs text-gray-500 mt-0.5">Letzte {{ days }} Tage</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="camp in adsCampaigns" :key="camp.name" class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ camp.name }}</p>
            </div>
            <div class="text-center shrink-0 w-16">
              <p class="text-sm font-bold text-gray-700">CHF {{ camp.spend.toFixed(0) }}</p>
              <p class="text-xs text-gray-400">Spend</p>
            </div>
            <div class="text-center shrink-0 w-12">
              <p class="text-sm font-bold text-gray-700">{{ camp.clicks }}</p>
              <p class="text-xs text-gray-400">Klicks</p>
            </div>
            <div class="text-center shrink-0 w-16">
              <p class="text-sm font-bold text-gray-700">{{ camp.clicks > 0 ? 'CHF ' + (camp.spend / camp.clicks).toFixed(2) : '—' }}</p>
              <p class="text-xs text-gray-400">CPC</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTR Bugs: Top Ranks, 0 Clicks -->
      <div v-if="ctrBugs.length > 0" class="bg-white rounded-xl border border-amber-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-amber-100 bg-amber-50">
          <h3 class="font-semibold text-amber-800">CTR-Bugs: Gute Position, kaum Klicks</h3>
          <p class="text-xs text-amber-600 mt-0.5">Diese Seiten ranken auf Seite 1 aber werden nicht geklickt — Title oder Meta-Description optimieren</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="bug in ctrBugs" :key="bug.query + bug.page" class="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ bug.query }}</p>
              <p class="text-xs text-gray-400 truncate">{{ bug.page }}</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-amber-600">{{ Number(bug.avg_pos).toFixed(1) }}</p>
              <p class="text-xs text-gray-400">Pos.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-gray-700">{{ bug.impressions }}</p>
              <p class="text-xs text-gray-400">Impr.</p>
            </div>
            <div class="text-center shrink-0 w-14">
              <p class="text-sm font-bold text-red-500">{{ bug.clicks }}</p>
              <p class="text-xs text-gray-400">Klicks</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useTenantBranding } from '~/composables/useTenantBranding'
import LoadingLogo from '~/components/LoadingLogo.vue'

definePageMeta({ middleware: 'auth' })

const { primaryColor } = useTenantBranding()
const { currentUser, isLoading, fetchCurrentUser } = useCurrentUser()

const days = ref(30)
const data = ref<any>(null)
const weeklyReview = ref<any>(null)
const seoOpportunities = ref<any[]>([])
const ctrBugs = ref<any[]>([])
const fetchingData = ref(false)

onMounted(async () => {
  await fetchCurrentUser()
  if (currentUser.value) {
    await Promise.all([fetchMarketingData(), fetchWeeklyReview(), fetchSeoData()])
  }
})

async function changeDays(d: number) {
  days.value = d
  await fetchMarketingData()
}

async function fetchMarketingData() {
  fetchingData.value = true
  try {
    data.value = await $fetch(`/api/admin/marketing-analytics?days=${days.value}`)
  } catch (e) {
    console.error('marketing fetch failed', e)
  } finally {
    fetchingData.value = false
  }
}

async function fetchWeeklyReview() {
  try {
    weeklyReview.value = await $fetch('/api/admin/marketing-weekly-review')
  } catch { /* no review yet */ }
}

async function fetchSeoData() {
  try {
    const res = await $fetch<any>('/api/admin/marketing-seo-opportunities')
    seoOpportunities.value = res.opportunities ?? []
    ctrBugs.value = res.ctrBugs ?? []
  } catch { /* no data */ }
}

// ── Computed ─────────────────────────────────────────────────────────────────

const totalSessions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4.reduce((sum: number, r: any) => sum + (r.sessions ?? 0), 0)
})

const MARKETING_CHANNELS = ['Organic Search', 'Paid Search', 'Referral', 'Organic Social', 'Email', 'Affiliates']

const totalConversions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4.reduce((sum: number, r: any) => sum + (r.conversions ?? 0), 0)
})

// Marketing-only: exclude Unassigned (existing students via app) and Direct (ambiguous)
const marketingConversions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4
    .filter((r: any) => MARKETING_CHANNELS.includes(r.channel))
    .reduce((sum: number, r: any) => sum + (r.conversions ?? 0), 0)
})

const marketingSessions = computed(() => {
  if (!data.value?.ga4) return 0
  return data.value.ga4
    .filter((r: any) => MARKETING_CHANNELS.includes(r.channel))
    .reduce((sum: number, r: any) => sum + (r.sessions ?? 0), 0)
})

const cvrFormatted = computed(() => {
  if (!totalSessions.value) return '0'
  return ((totalConversions.value / totalSessions.value) * 100).toFixed(1)
})

const marketingCvrFormatted = computed(() => {
  if (!marketingSessions.value) return '0'
  return ((marketingConversions.value / marketingSessions.value) * 100).toFixed(1)
})

const channelStats = computed(() => {
  if (!data.value?.ga4) return []
  const map = new Map<string, { sessions: number; conversions: number }>()
  for (const r of data.value.ga4) {
    const ch = r.channel ?? 'Unbekannt'
    const existing = map.get(ch) ?? { sessions: 0, conversions: 0 }
    map.set(ch, { sessions: existing.sessions + (r.sessions ?? 0), conversions: existing.conversions + (r.conversions ?? 0) })
  }
  const total = [...map.values()].reduce((s, v) => s + v.sessions, 0) || 1
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      sessions: v.sessions,
      conversions: v.conversions,
      cvr: v.sessions > 0 ? ((v.conversions / v.sessions) * 100).toFixed(1) : '0',
      pct: Math.round((v.sessions / total) * 100),
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 7)
    .map(ch => ({
      ...ch,
      isMarketing: MARKETING_CHANNELS.includes(ch.channel),
    }))
})

const adsCampaigns = computed(() => {
  if (!data.value?.googleAds) return []
  const map = new Map<string, { spend: number; clicks: number }>()
  for (const r of data.value.googleAds) {
    const name = r.campaign_name ?? 'Unbekannt'
    const existing = map.get(name) ?? { spend: 0, clicks: 0 }
    map.set(name, {
      spend: existing.spend + (r.cost_micros ?? 0) / 1_000_000,
      clicks: existing.clicks + (r.clicks ?? 0),
    })
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.spend - a.spend)
})

const funnelSteps = computed(() => {
  if (!data.value) return []
  const f = data.value.bookingFunnel
  const max = Math.max(f.websiteClicks, 1)
  return [
    { label: 'Website-Klicks', value: f.websiteClicks, pct: 100, color: primaryColor.value },
    { label: 'Buchungsapp geöffnet', value: f.bookingPageViews, pct: Math.round((f.bookingPageViews / max) * 100), color: '#f59e0b' },
    { label: 'Buchung abgeschlossen', value: f.completions, pct: Math.round((f.completions / max) * 100), color: '#10b981' },
  ]
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>
