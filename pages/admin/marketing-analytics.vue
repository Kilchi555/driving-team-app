<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Marketing Analytics</h1>
        <p class="text-sm text-gray-500 mt-1">Google Ads · Meta Ads · GA4 · Search Console · Buchungsfunnel</p>
      </div>
      <USelect v-model="days" :options="dayOptions" option-attribute="label" value-attribute="value" class="w-36" />
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-primary-500" />
    </div>

    <template v-else-if="data">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <UCard>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Gesamtausgaben</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            CHF {{ data.summary.totalSpend.toFixed(2) }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            Google CHF {{ data.summary.googleSpend.toFixed(2) }} · Meta CHF {{ data.summary.metaSpend.toFixed(2) }}
          </div>
        </UCard>

        <UCard>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Ad Klicks total</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ data.summary.totalAdClicks.toLocaleString('de-CH') }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            CPA CHF {{ data.summary.totalSpend > 0 && data.summary.completedBookings > 0
              ? (data.summary.totalSpend / data.summary.completedBookings).toFixed(2)
              : '–' }}
          </div>
        </UCard>

        <UCard>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Website → Buchung</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ data.summary.websiteToBookingClicks.toLocaleString('de-CH') }}
          </div>
          <div class="text-xs text-gray-400 mt-1">Klicks auf Termin buchen</div>
        </UCard>

        <UCard>
          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Buchungen abgeschlossen</div>
          <div class="text-2xl font-bold text-green-600">
            {{ data.summary.completedBookings.toLocaleString('de-CH') }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            Abschlussrate {{ data.summary.bookingCompletionRate }}%
          </div>
        </UCard>
      </div>

      <!-- Tabs -->
      <UTabs :items="tabs" class="mt-2">
        <template #google-ads>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Kampagnen Performance</h3>
            <UTable
              :rows="googleAdsCampaigns"
              :columns="googleAdsColumns"
              :empty-state="{ icon: 'i-heroicons-chart-bar', label: 'Keine Google Ads Daten – Credentials noch nicht konfiguriert.' }"
            />
          </div>
        </template>

        <template #meta-ads>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Kampagnen Performance</h3>
            <UTable
              :rows="metaAdsCampaigns"
              :columns="metaAdsColumns"
              :empty-state="{ icon: 'i-heroicons-chart-bar', label: 'Keine Meta Ads Daten – Credentials noch nicht konfiguriert.' }"
            />
          </div>
        </template>

        <template #ga4>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Traffic nach Kanal (Top 10 Tage)</h3>
            <UTable
              :rows="ga4Rows"
              :columns="ga4Columns"
              :empty-state="{ icon: 'i-heroicons-chart-bar', label: 'Keine GA4 Daten – Credentials noch nicht konfiguriert.' }"
            />
          </div>
        </template>

        <template #gsc>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Keywords</h3>
            <UTable
              :rows="gscTopQueries"
              :columns="gscColumns"
              :empty-state="{ icon: 'i-heroicons-magnifying-glass', label: 'Keine Search Console Daten – Credentials noch nicht konfiguriert.' }"
            />
          </div>
        </template>

        <template #funnel>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Buchungsfunnel (First-Party)</h3>
            <div class="flex items-center gap-4 text-sm flex-wrap">
              <div class="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-4 py-3">
                <span class="text-2xl font-bold text-blue-600">{{ data.summary.websiteToBookingClicks }}</span>
                <span class="text-gray-600 dark:text-gray-300">Website-Klicks<br>auf «Termin buchen»</span>
              </div>
              <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 text-gray-400" />
              <div class="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg px-4 py-3">
                <span class="text-2xl font-bold text-yellow-600">{{ data.summary.viewedBookings }}</span>
                <span class="text-gray-600 dark:text-gray-300">Buchungsseite<br>geöffnet</span>
              </div>
              <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 text-gray-400" />
              <div class="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 rounded-lg px-4 py-3">
                <span class="text-2xl font-bold text-green-600">{{ data.summary.completedBookings }}</span>
                <span class="text-gray-600 dark:text-gray-300">Buchungen<br>abgeschlossen</span>
              </div>
              <div class="ml-4 text-gray-500 text-xs">
                Abschlussrate: <strong>{{ data.summary.bookingCompletionRate }}%</strong>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-4">
              Quelle: First-party Daten aus booking_events + booking_redirects (app.simy.ch – kein Pixel nötig)
            </p>
          </div>
        </template>
      </UTabs>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const days = ref(30)
const dayOptions = [
  { label: '7 Tage', value: 7 },
  { label: '30 Tage', value: 30 },
  { label: '60 Tage', value: 60 },
  { label: '90 Tage', value: 90 },
]

const { data, pending, refresh } = await useFetch('/api/admin/marketing-analytics', {
  query: computed(() => ({ days: days.value })),
  watch: [days],
})

const tabs = [
  { label: 'Google Ads', slot: 'google-ads', icon: 'i-heroicons-magnifying-glass-circle' },
  { label: 'Meta Ads', slot: 'meta-ads', icon: 'i-heroicons-megaphone' },
  { label: 'GA4 Traffic', slot: 'ga4', icon: 'i-heroicons-chart-bar' },
  { label: 'Search Console', slot: 'gsc', icon: 'i-heroicons-magnifying-glass' },
  { label: 'Buchungsfunnel', slot: 'funnel', icon: 'i-heroicons-funnel' },
]

// ── Google Ads ──────────────────────────────────────────────
const googleAdsColumns = [
  { key: 'campaign_name', label: 'Kampagne' },
  { key: 'spend', label: 'Ausgaben (CHF)' },
  { key: 'clicks', label: 'Klicks' },
  { key: 'impressions', label: 'Impressionen' },
  { key: 'ctr', label: 'CTR' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'cpa', label: 'CPA (CHF)' },
]

const googleAdsCampaigns = computed(() => {
  const rows = data.value?.googleAds ?? []
  const byId: Record<string, any> = {}
  for (const r of rows) {
    if (!byId[r.campaign_id]) {
      byId[r.campaign_id] = { campaign_name: r.campaign_name, cost_micros: 0, clicks: 0, impressions: 0, conversions: 0 }
    }
    byId[r.campaign_id].cost_micros += r.cost_micros
    byId[r.campaign_id].clicks += r.clicks
    byId[r.campaign_id].impressions += r.impressions
    byId[r.campaign_id].conversions += parseFloat(r.conversions)
  }
  return Object.values(byId).map((r) => {
    const spend = r.cost_micros / 1_000_000
    const ctr = r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) + '%' : '–'
    const cpa = r.conversions > 0 ? 'CHF ' + (spend / r.conversions).toFixed(2) : '–'
    return { campaign_name: r.campaign_name, spend: 'CHF ' + spend.toFixed(2), clicks: r.clicks, impressions: r.impressions, ctr, conversions: r.conversions.toFixed(1), cpa }
  }).sort((a, b) => parseFloat(b.spend.replace('CHF ', '')) - parseFloat(a.spend.replace('CHF ', '')))
})

// ── Meta Ads ────────────────────────────────────────────────
const metaAdsColumns = [
  { key: 'campaign_name', label: 'Kampagne' },
  { key: 'spend', label: 'Ausgaben (CHF)' },
  { key: 'clicks', label: 'Klicks' },
  { key: 'impressions', label: 'Impressionen' },
  { key: 'reach', label: 'Reichweite' },
  { key: 'ctr', label: 'CTR' },
]

const metaAdsCampaigns = computed(() => {
  const rows = data.value?.metaAds ?? []
  const byId: Record<string, any> = {}
  for (const r of rows) {
    if (!byId[r.campaign_id]) {
      byId[r.campaign_id] = { campaign_name: r.campaign_name, spend: 0, clicks: 0, impressions: 0, reach: 0 }
    }
    byId[r.campaign_id].spend += parseFloat(r.spend)
    byId[r.campaign_id].clicks += r.clicks
    byId[r.campaign_id].impressions += r.impressions
    byId[r.campaign_id].reach += r.reach
  }
  return Object.values(byId).map((r) => {
    const ctr = r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) + '%' : '–'
    return { campaign_name: r.campaign_name, spend: 'CHF ' + r.spend.toFixed(2), clicks: r.clicks, impressions: r.impressions, reach: r.reach.toLocaleString('de-CH'), ctr }
  }).sort((a, b) => parseFloat(b.spend.replace('CHF ', '')) - parseFloat(a.spend.replace('CHF ', '')))
})

// ── GA4 ─────────────────────────────────────────────────────
const ga4Columns = [
  { key: 'date', label: 'Datum' },
  { key: 'channel', label: 'Kanal' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'users', label: 'Nutzer' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'engagement_rate_fmt', label: 'Engagement' },
]

const ga4Rows = computed(() =>
  (data.value?.ga4 ?? []).slice(0, 50).map((r: any) => ({
    ...r,
    engagement_rate_fmt: (parseFloat(r.engagement_rate) * 100).toFixed(1) + '%',
  }))
)

// ── Search Console ───────────────────────────────────────────
const gscColumns = [
  { key: 'query', label: 'Keyword' },
  { key: 'clicks', label: 'Klicks' },
  { key: 'impressions', label: 'Impressionen' },
  { key: 'ctr_fmt', label: 'CTR' },
  { key: 'position_fmt', label: 'Ø Position' },
]

const gscTopQueries = computed(() => {
  const rows = data.value?.gsc ?? []
  const byQuery: Record<string, any> = {}
  for (const r of rows) {
    if (!byQuery[r.query]) byQuery[r.query] = { query: r.query, clicks: 0, impressions: 0, ctr_sum: 0, position_sum: 0, count: 0 }
    byQuery[r.query].clicks += r.clicks
    byQuery[r.query].impressions += r.impressions
    byQuery[r.query].ctr_sum += parseFloat(r.ctr)
    byQuery[r.query].position_sum += parseFloat(r.position)
    byQuery[r.query].count++
  }
  return Object.values(byQuery).map((r) => ({
    query: r.query,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr_fmt: ((r.ctr_sum / r.count) * 100).toFixed(1) + '%',
    position_fmt: (r.position_sum / r.count).toFixed(1),
  })).sort((a, b) => b.clicks - a.clicks).slice(0, 30)
})
</script>
