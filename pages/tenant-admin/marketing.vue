<template>
  <div>
    <!-- Header -->
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Marketing Command Center</h1>
        <p class="sa-page-sub">Alle Kanäle, Conversions & Quick-Wins auf einen Blick</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="selectedTenant" @change="load" class="sa-select">
          <option value="">Alle Tenants</option>
          <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <select v-model="selectedDays" @change="load" class="sa-select">
          <option :value="7">7 Tage</option>
          <option :value="30">30 Tage</option>
          <option :value="90">90 Tage</option>
        </select>
        <button @click="load" :disabled="isLoading" class="sa-btn-primary">
          <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Aktualisieren
        </button>
      </div>
    </div>

    <!-- Quick Wins -->
    <div v-if="data" class="sa-card mb-5" style="border-left: 3px solid #818cf8;">
      <div class="sa-card-header">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <h2 class="sa-card-title">Daily Quick Wins</h2>
          <span class="sa-pill">{{ data.quickWins.length }}</span>
        </div>
        <span class="sa-cell-muted text-xs">Algorithmische Empfehlungen aus aktuellen Daten</span>
      </div>
      <div v-if="data.quickWins.length === 0" class="sa-empty">
        Keine offenen Quick-Wins – alles im grünen Bereich.
      </div>
      <div v-else class="qw-list">
        <div v-for="(qw, i) in data.quickWins" :key="i" class="qw-item" :class="`qw-${qw.severity}`">
          <div class="qw-side">
            <div class="qw-sev" :class="`qw-sev-${qw.severity}`">
              {{ qw.severity === 'high' ? 'HOCH' : qw.severity === 'medium' ? 'MITTEL' : 'NIEDRIG' }}
            </div>
            <div class="qw-cat">{{ qw.category }}</div>
          </div>
          <div class="qw-body">
            <div class="qw-title">{{ qw.title }}</div>
            <div class="qw-detail">{{ qw.detail }}</div>
            <div class="qw-meta">
              <span v-if="qw.metric" class="qw-metric">{{ qw.metric }}</span>
              <span v-if="qw.action" class="qw-action">→ {{ qw.action }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div v-if="data" class="sa-kpi-grid">
      <div class="sa-kpi-card sa-kpi-emerald">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <div class="sa-kpi-value">{{ data.summary.bookings }}</div>
        <div class="sa-kpi-label">Buchungen</div>
        <div class="sa-kpi-trend" :class="data.summary.bookingGrowthPct >= 0 ? 'sa-trend-up' : 'sa-trend-down'">
          {{ data.summary.bookingGrowthPct >= 0 ? '+' : '' }}{{ data.summary.bookingGrowthPct }}% vs. Vorperiode
        </div>
      </div>

      <div class="sa-kpi-card sa-kpi-indigo">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2"/></svg>
        </div>
        <div class="sa-kpi-value">{{ fmtNum(data.summary.sessions) }}</div>
        <div class="sa-kpi-label">Sessions (GA4)</div>
        <div class="sa-kpi-sub">{{ fmtNum(data.summary.users) }} Users</div>
      </div>

      <div class="sa-kpi-card sa-kpi-amber">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div class="sa-kpi-value">{{ fmtNum(data.summary.gscImpressions) }}</div>
        <div class="sa-kpi-label">GSC Impressions</div>
        <div class="sa-kpi-sub">Pos. {{ data.summary.gscAvgPosition }} · CTR {{ data.summary.gscCtr }}%</div>
      </div>

      <div class="sa-kpi-card sa-kpi-rose">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div class="sa-kpi-value">CHF {{ fmtNum(data.summary.totalAdSpend) }}</div>
        <div class="sa-kpi-label">Ad-Spend</div>
        <div class="sa-kpi-sub">G: CHF {{ fmtNum(data.summary.googleSpend) }} · M: CHF {{ fmtNum(data.summary.metaSpend) }}</div>
      </div>

      <div class="sa-kpi-card sa-kpi-violet">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
        </div>
        <div class="sa-kpi-value">{{ data.summary.conversionRate }}%</div>
        <div class="sa-kpi-label">Conversion Rate</div>
        <div class="sa-kpi-sub">Bookings / Sessions</div>
      </div>

      <div class="sa-kpi-card sa-kpi-emerald">
        <div class="sa-kpi-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m3 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H10a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        </div>
        <div class="sa-kpi-value">CHF {{ data.summary.costPerBooking }}</div>
        <div class="sa-kpi-label">Cost per Booking</div>
        <div class="sa-kpi-sub">{{ data.summary.paidBookings }} Paid Bookings</div>
      </div>
    </div>

    <!-- Trend Chart -->
    <div v-if="data" class="sa-card mb-5">
      <div class="sa-card-header">
        <h2 class="sa-card-title">Verlauf · letzte {{ data.window.days }} Tage</h2>
        <div class="flex gap-3 text-xs">
          <span class="legend"><span class="dot" style="background:#34d399"></span> Sessions</span>
          <span class="legend"><span class="dot" style="background:#818cf8"></span> Clicks</span>
          <span class="legend"><span class="dot" style="background:#fbbf24"></span> Bookings ×10</span>
        </div>
      </div>
      <div class="trend-wrap">
        <svg :viewBox="`0 0 ${trendWidth} ${trendHeight}`" preserveAspectRatio="none" class="trend-svg">
          <!-- grid -->
          <line v-for="y in [0.25, 0.5, 0.75]" :key="y" :x1="0" :x2="trendWidth" :y1="y*trendHeight" :y2="y*trendHeight" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <!-- sessions area -->
          <path :d="trendPath('sessions', '#34d399')" fill="none" stroke="#34d399" stroke-width="2" />
          <!-- clicks -->
          <path :d="trendPath('clicks', '#818cf8')" fill="none" stroke="#818cf8" stroke-width="2" />
          <!-- bookings × 10 -->
          <path :d="trendPath('bookings', '#fbbf24', 10)" fill="none" stroke="#fbbf24" stroke-width="2" />
        </svg>
        <div class="trend-axis">
          <span>{{ fmtDate(data.trend[0]?.date) }}</span>
          <span>{{ fmtDate(data.trend[Math.floor(data.trend.length/2)]?.date) }}</span>
          <span>{{ fmtDate(data.trend[data.trend.length-1]?.date) }}</span>
        </div>
      </div>
    </div>

    <!-- Funnel & Customer Origin row -->
    <div v-if="data" class="sa-two-col mb-5">
      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">Conversion Funnel</h2></div>
        <div class="funnel">
          <div class="funnel-step" v-for="(step, i) in funnelSteps" :key="i" :style="{ width: step.width + '%' }">
            <div class="funnel-bar" :style="{ background: step.color }">
              <div class="funnel-label">{{ step.label }}</div>
              <div class="funnel-value">{{ fmtNum(step.value) }}</div>
            </div>
            <div v-if="i < funnelSteps.length - 1" class="funnel-drop">
              <span class="funnel-arrow">↓</span>
              <span class="funnel-pct">{{ step.dropPct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sa-card">
        <div class="sa-card-header"><h2 class="sa-card-title">Customer Origin</h2></div>
        <div class="origin-list">
          <div v-for="ch in sortedChannels" :key="ch.name" class="origin-row">
            <div class="origin-name">
              <span class="origin-dot" :style="{ background: channelColor(ch.name) }"></span>
              {{ ch.name }}
            </div>
            <div class="origin-bar-wrap">
              <div class="origin-bar" :style="{ width: channelPct(ch) + '%', background: channelColor(ch.name) }"></div>
            </div>
            <div class="origin-stats">
              <span class="origin-bookings">{{ ch.bookings }} Bookings</span>
              <span class="origin-sub">{{ fmtNum(ch.sessions) }} Sess</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Google Ads Campaigns -->
    <div v-if="data && data.adsCampaigns.length > 0" class="sa-card mb-5">
      <div class="sa-card-header">
        <h2 class="sa-card-title">Google Ads · Kampagnen</h2>
        <span class="sa-cell-muted text-xs">{{ data.adsCampaigns.length }} aktive Kampagnen</span>
      </div>
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Kampagne</th>
              <th class="num">Impressions</th>
              <th class="num">Klicks</th>
              <th class="num">CTR</th>
              <th class="num">Kosten</th>
              <th class="num">CPC</th>
              <th class="num">Conv.</th>
              <th class="num">CPA</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in data.adsCampaigns" :key="c.campaign_id">
              <td><div class="sa-tenant-name">{{ c.campaign_name }}</div></td>
              <td class="num sa-cell-muted">{{ fmtNum(c.impressions) }}</td>
              <td class="num sa-cell-muted">{{ fmtNum(c.clicks) }}</td>
              <td class="num"><span :class="c.ctr >= 3 ? 'text-emerald-400' : c.ctr >= 1.5 ? 'text-amber-400' : 'text-rose-400'">{{ c.ctr.toFixed(2) }}%</span></td>
              <td class="num">CHF {{ c.cost.toFixed(2) }}</td>
              <td class="num sa-cell-muted">CHF {{ c.cpc.toFixed(2) }}</td>
              <td class="num">{{ c.conversions }}</td>
              <td class="num"><span :class="c.cpa > 0 && c.cpa < 20 ? 'text-emerald-400' : c.cpa < 40 ? 'text-amber-400' : 'text-rose-400'">{{ c.cpa > 0 ? `CHF ${c.cpa.toFixed(2)}` : '–' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top GSC Queries -->
    <div v-if="data" class="sa-two-col mb-5">
      <div class="sa-card">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Top Suchanfragen (Google)</h2>
          <span class="sa-cell-muted text-xs">Sortiert nach Klicks</span>
        </div>
        <div class="sa-table-wrap">
          <table class="sa-table">
            <thead>
              <tr>
                <th>Query</th>
                <th class="num">Klicks</th>
                <th class="num">Impr.</th>
                <th class="num">CTR</th>
                <th class="num">Pos.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(q, i) in data.topQueries" :key="i">
                <td class="query-cell">{{ q.query }}</td>
                <td class="num">{{ q.clicks }}</td>
                <td class="num sa-cell-muted">{{ fmtNum(q.impressions) }}</td>
                <td class="num">{{ q.ctr.toFixed(1) }}%</td>
                <td class="num"><span :class="q.position <= 3 ? 'text-emerald-400' : q.position <= 10 ? 'text-amber-400' : 'text-rose-400'">{{ q.position.toFixed(1) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="sa-card">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Top Seiten (GSC)</h2>
          <span class="sa-cell-muted text-xs">Sortiert nach Klicks</span>
        </div>
        <div class="sa-table-wrap">
          <table class="sa-table">
            <thead>
              <tr>
                <th>Page</th>
                <th class="num">Klicks</th>
                <th class="num">Impr.</th>
                <th class="num">CTR</th>
                <th class="num">Pos.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in data.topPages" :key="i">
                <td class="page-cell">{{ shortPath(p.page) }}</td>
                <td class="num">{{ p.clicks }}</td>
                <td class="num sa-cell-muted">{{ fmtNum(p.impressions) }}</td>
                <td class="num">{{ p.ctr.toFixed(1) }}%</td>
                <td class="num"><span :class="p.position <= 3 ? 'text-emerald-400' : p.position <= 10 ? 'text-amber-400' : 'text-rose-400'">{{ p.position.toFixed(1) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Top GA4 Pages + Tracking Health -->
    <div v-if="data" class="sa-two-col mb-5">
      <div class="sa-card">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Meistbesuchte Seiten (GA4)</h2>
          <span class="sa-cell-muted text-xs">Sortiert nach Sessions</span>
        </div>
        <div class="sa-table-wrap">
          <table class="sa-table">
            <thead>
              <tr>
                <th>Page</th>
                <th class="num">Sessions</th>
                <th class="num">Page Views</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in data.topGa4Pages" :key="i">
                <td class="page-cell">{{ shortPath(p.page) }}</td>
                <td class="num">{{ fmtNum(p.sessions) }}</td>
                <td class="num sa-cell-muted">{{ fmtNum(p.pageViews) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="sa-card">
        <div class="sa-card-header">
          <h2 class="sa-card-title">Tracking Health</h2>
        </div>
        <div class="space-y-3">
          <div class="sa-metric-row">
            <span class="sa-metric-label">Booking-Page Views</span>
            <span class="sa-metric-val">{{ fmtNum(data.summary.bookingPageViewed) }}</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Booking Started</span>
            <span class="sa-metric-val">{{ fmtNum(data.summary.bookingStarted) }}</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Booking Completed</span>
            <span class="sa-metric-val text-emerald-400">{{ fmtNum(data.summary.bookingCompleted) }}</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Booking Abandoned</span>
            <span class="sa-metric-val text-rose-400">{{ fmtNum(data.summary.bookingAbandoned) }}</span>
          </div>
          <div class="sa-divider"></div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Booking Funnel Rate</span>
            <span class="sa-metric-val">{{ data.summary.bookingFunnelRate }}%</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Server-Conversion Uploads ✓</span>
            <span class="sa-metric-val text-emerald-400">{{ data.summary.conversionUploadsSuccess }}</span>
          </div>
          <div class="sa-metric-row">
            <span class="sa-metric-label">Server-Conversion Uploads ✗</span>
            <span class="sa-metric-val" :class="data.summary.conversionUploadsFailed > 0 ? 'text-rose-400' : 'text-slate-500'">{{ data.summary.conversionUploadsFailed }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / Error states -->
    <div v-if="isLoading && !data" class="sa-card">
      <div class="sa-empty">Lädt Marketing-Daten…</div>
    </div>
    <div v-if="error" class="sa-card" style="border-left: 3px solid #f87171;">
      <div class="sa-empty">
        <div class="text-rose-400 mb-1">Fehler beim Laden</div>
        <div class="text-xs text-slate-500">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin' })

import { ref, computed, onMounted } from 'vue'

interface QuickWin {
  severity: 'high' | 'medium' | 'low'
  category: string
  title: string
  detail: string
  metric?: string
  action?: string
}

interface Channel { name: string; sessions: number; bookings: number; spend: number; clicks: number; impressions: number }

interface MarketingOverview {
  ok: boolean
  took_ms: number
  window: { days: number; since: string; until: string }
  tenants: Array<{ id: string; name: string; slug: string }>
  summary: Record<string, number>
  channels: Channel[]
  funnel: { impressions: number; sessions: number; bookingPageViews: number; bookingStarted: number; bookingCompleted: number; conversionRate: number; bookingFunnelRate: number }
  trend: Array<{ date: string; sessions: number; clicks: number; bookings: number; spend: number; impressions: number }>
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
  topGa4Pages: Array<{ page: string; sessions: number; pageViews: number }>
  adsCampaigns: Array<{ campaign_id: string; campaign_name: string; cost: number; clicks: number; impressions: number; conversions: number; ctr: number; cpc: number; cpa: number }>
  quickWins: QuickWin[]
}

const isLoading = ref(false)
const error = ref<string | null>(null)
const data = ref<MarketingOverview | null>(null)
const tenants = ref<Array<{ id: string; name: string; slug: string }>>([])
const selectedTenant = ref('')
const selectedDays = ref(30)

const trendWidth = 1000
const trendHeight = 180

const load = async () => {
  isLoading.value = true
  error.value = null
  try {
    const res = await $fetch<MarketingOverview>('/api/tenant-admin/marketing-overview', {
      query: {
        days: selectedDays.value,
        ...(selectedTenant.value ? { tenant_id: selectedTenant.value } : {}),
      },
    })
    data.value = res
    if (res.tenants) tenants.value = res.tenants
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Unbekannter Fehler'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const fmtNum = (n: number | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k'
  return n.toLocaleString('de-CH', { maximumFractionDigits: n % 1 ? 2 : 0 })
}

const fmtDate = (d?: string) => {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return `${day}.${m}.`
}

const shortPath = (p: string) => {
  if (!p) return '/'
  try {
    const u = new URL(p)
    return u.pathname || '/'
  } catch {
    return p.length > 50 ? '…' + p.slice(-47) : p
  }
}

const funnelSteps = computed(() => {
  if (!data.value) return [] as Array<{ label: string; value: number; width: number; color: string; dropPct: number }>
  const f = data.value.funnel
  const steps = [
    { label: 'Impressions', value: f.impressions, color: '#6366f1' },
    { label: 'Sessions', value: f.sessions, color: '#34d399' },
    { label: 'Booking-Page Views', value: f.bookingPageViews, color: '#fbbf24' },
    { label: 'Booking Started', value: Math.max(f.bookingStarted, f.bookingCompleted), color: '#f59e0b' },
    { label: 'Booking Completed', value: f.bookingCompleted, color: '#10b981' },
  ]
  const max = Math.max(...steps.map((s) => s.value), 1)
  return steps.map((s, i) => {
    const width = Math.max((s.value / max) * 100, 5)
    const next = steps[i + 1]
    const dropPct = next && s.value > 0 ? Math.round((next.value / s.value) * 100) : 0
    return { ...s, width, dropPct }
  })
})

const sortedChannels = computed(() => {
  if (!data.value) return [] as Channel[]
  return [...data.value.channels].sort((a, b) => b.bookings - a.bookings || b.sessions - a.sessions)
})

const channelMax = computed(() => {
  if (!data.value) return 1
  return Math.max(...data.value.channels.map((c) => Math.max(c.bookings, c.sessions / 50)), 1)
})

const channelPct = (c: Channel) => {
  const v = Math.max(c.bookings, c.sessions / 50)
  return Math.max((v / channelMax.value) * 100, 4)
}

const channelColor = (name: string) => {
  const map: Record<string, string> = {
    'Google Ads': '#f59e0b',
    'Meta Ads': '#3b82f6',
    'Google Organic': '#10b981',
    'Direct': '#a78bfa',
    'Referral': '#ec4899',
    'Other': '#64748b',
  }
  return map[name] || '#64748b'
}

const trendPath = (key: 'sessions' | 'clicks' | 'bookings', _color: string, multiplier = 1) => {
  if (!data.value || data.value.trend.length === 0) return ''
  const pts = data.value.trend
  const maxValue = Math.max(...pts.map((p) => (p[key] || 0) * multiplier), 1)
  const stepX = trendWidth / Math.max(pts.length - 1, 1)
  const padding = 8
  const usableH = trendHeight - padding * 2
  const path = pts.map((p, i) => {
    const x = i * stepX
    const v = (p[key] || 0) * multiplier
    const y = trendHeight - padding - (v / maxValue) * usableH
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  })
  return path.join(' ')
}
</script>

<style scoped>
/* Reuse the existing .sa-* design system from layout */

.sa-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.15);
  color: #c7d2fe;
  font-size: 0.7rem;
  font-weight: 700;
  margin-left: 4px;
}

/* Quick Wins */
.qw-list { display: flex; flex-direction: column; gap: 0.5rem; }
.qw-item {
  display: flex;
  gap: 0.875rem;
  padding: 0.75rem 0.875rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 8px;
  transition: background 0.15s;
}
.qw-item:hover { background: rgba(255,255,255,0.04); }
.qw-high { border-left: 3px solid #f87171; }
.qw-medium { border-left: 3px solid #fbbf24; }
.qw-low { border-left: 3px solid #818cf8; }
.qw-side { min-width: 90px; display: flex; flex-direction: column; gap: 4px; }
.qw-sev { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 4px; width: fit-content; }
.qw-sev-high { background: rgba(248,113,113,0.15); color: #fca5a5; }
.qw-sev-medium { background: rgba(251,191,36,0.15); color: #fcd34d; }
.qw-sev-low { background: rgba(129,140,248,0.15); color: #c7d2fe; }
.qw-cat { font-size: 0.7rem; color: #94a3b8; font-weight: 500; }
.qw-body { flex: 1; min-width: 0; }
.qw-title { color: #f1f5f9; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; }
.qw-detail { color: #94a3b8; font-size: 0.8rem; line-height: 1.45; margin-bottom: 0.375rem; }
.qw-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.7rem; }
.qw-metric {
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255,255,255,0.05);
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.qw-action { color: #a5b4fc; font-weight: 500; }

/* Trend chart */
.trend-wrap { padding: 0 0.5rem; }
.trend-svg {
  width: 100%;
  height: 180px;
  display: block;
}
.trend-axis {
  display: flex;
  justify-content: space-between;
  padding-top: 0.5rem;
  font-size: 0.7rem;
  color: #64748b;
}
.legend { display: inline-flex; align-items: center; gap: 0.375rem; color: #94a3b8; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }

/* Funnel */
.funnel { display: flex; flex-direction: column; gap: 0.25rem; }
.funnel-step { margin: 0 auto; transition: width 0.3s ease; }
.funnel-bar {
  border-radius: 6px;
  padding: 0.625rem 1rem;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.85rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.funnel-label { font-weight: 500; opacity: 0.95; font-size: 0.8rem; }
.funnel-value { font-family: ui-monospace, monospace; font-size: 0.9rem; }
.funnel-drop {
  display: flex; justify-content: center; align-items: center; gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.7rem; color: #94a3b8;
}
.funnel-arrow { color: #475569; font-size: 1rem; }
.funnel-pct { font-family: ui-monospace, monospace; font-weight: 600; color: #cbd5e1; }

/* Origin */
.origin-list { display: flex; flex-direction: column; gap: 0.625rem; }
.origin-row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  align-items: center;
  gap: 0.75rem;
}
.origin-name {
  display: flex; align-items: center; gap: 0.5rem;
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 500;
}
.origin-dot { width: 10px; height: 10px; border-radius: 50%; }
.origin-bar-wrap {
  height: 12px;
  background: rgba(255,255,255,0.04);
  border-radius: 6px;
  overflow: hidden;
}
.origin-bar { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
.origin-stats { text-align: right; min-width: 120px; }
.origin-bookings { font-size: 0.85rem; color: #f1f5f9; font-weight: 600; }
.origin-sub { font-size: 0.7rem; color: #64748b; margin-left: 0.5rem; }

/* Table cells */
.sa-table th.num, .sa-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.query-cell, .page-cell {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e2e8f0;
}

.sa-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0.5rem 0; }
</style>
