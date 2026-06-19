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

      <!-- ── KPI Summary Row ── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Gesamtausgaben</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">CHF {{ data.summary.totalSpend.toFixed(2) }}</div>
          <div class="text-xs text-gray-400 mt-1">Google {{ data.summary.googleSpend.toFixed(2) }} · Meta {{ data.summary.metaSpend.toFixed(2) }}</div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Buchungen (Google Ads)</div>
          <div class="text-2xl font-bold text-blue-600">{{ data.summary.googleRealBookings }}</div>
          <div class="text-xs text-gray-400 mt-1">Aus echten App-Daten (UTM/gclid)</div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Echter CPA (Google)</div>
          <div class="text-2xl font-bold" :class="data.summary.googleCPA ? 'text-orange-500' : 'text-gray-400'">
            {{ data.summary.googleCPA ? 'CHF ' + data.summary.googleCPA.toFixed(2) : '–' }}
          </div>
          <div class="text-xs text-gray-400 mt-1">Spend ÷ Buchungen aus DB</div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">ROAS (Google)</div>
          <div class="text-2xl font-bold" :class="(data.summary.googleROAS ?? 0) >= 3 ? 'text-green-600' : (data.summary.googleROAS ?? 0) > 0 ? 'text-orange-500' : 'text-gray-400'">
            {{ data.summary.googleROAS ? data.summary.googleROAS.toFixed(2) + 'x' : '–' }}
          </div>
          <div class="text-xs text-gray-400 mt-1">
            Umsatz CHF {{ data.summary.googleRealRevenue.toFixed(2) }}
          </div>
        </div>
      </div>

      <!-- ── Attribution by Source ── -->
      <div v-if="data.attributionBySource?.length > 0" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-6">
        <div class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Buchungen nach Traffic-Quelle (erste {{ days }} Tage)</div>
        <div class="flex flex-wrap gap-3">
          <div
            v-for="src in data.attributionBySource"
            :key="src.source"
            class="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2.5"
          >
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wide">{{ src.source }}</div>
              <div class="font-bold text-gray-900 dark:text-white">{{ src.bookings }} Buchungen</div>
              <div v-if="src.revenue_chf > 0" class="text-xs text-green-600">CHF {{ src.revenue_chf.toFixed(2) }}</div>
            </div>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-3">Nur Buchungen mit UTM-Tracking oder gclid erfasst.</p>
      </div>

      <!-- ── Tabs ── -->
      <UTabs :items="tabs" class="mt-2">

        <!-- Google Ads: Campaign + Real Attribution -->
        <template #google-ads>
          <div class="mt-4 space-y-6">
            <!-- Campaign table with real attribution -->
            <div>
              <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-1">Kampagnen Performance</h3>
              <p class="text-xs text-gray-400 mb-3">
                "Echter CPA" &amp; "ROAS" basieren auf Buchungen mit utm_campaign in unserer DB —
                "Google CPA" ist die Zahl aus dem Google Ads Konto (kann abweichen).
              </p>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th class="pb-2 pr-4 font-semibold">Kampagne</th>
                      <th class="pb-2 pr-4 font-semibold text-right">Spend</th>
                      <th class="pb-2 pr-4 font-semibold text-right">Klicks</th>
                      <th class="pb-2 pr-4 font-semibold text-right">CTR</th>
                      <th class="pb-2 pr-4 font-semibold text-right">Google Conv.</th>
                      <th class="pb-2 pr-4 font-semibold text-right">Echte Buchungen</th>
                      <th class="pb-2 pr-4 font-semibold text-right">Umsatz</th>
                      <th class="pb-2 pr-4 font-semibold text-right">Echter CPA</th>
                      <th class="pb-2 font-semibold text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="c in googleCampaignsTable"
                      :key="c.campaign_id"
                      class="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td class="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-100 max-w-[200px] truncate">{{ c.campaign_name }}</td>
                      <td class="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-300">CHF {{ c.spend_chf.toFixed(2) }}</td>
                      <td class="py-2.5 pr-4 text-right text-gray-500">{{ c.clicks.toLocaleString('de-CH') }}</td>
                      <td class="py-2.5 pr-4 text-right text-gray-500">{{ c.ctr }}</td>
                      <td class="py-2.5 pr-4 text-right text-gray-500">{{ c.google_conversions.toFixed(1) }}</td>
                      <td class="py-2.5 pr-4 text-right">
                        <span :class="c.real_bookings > 0 ? 'text-blue-600 font-semibold' : 'text-gray-300'">{{ c.real_bookings }}</span>
                      </td>
                      <td class="py-2.5 pr-4 text-right">
                        <span :class="c.real_revenue_chf > 0 ? 'text-green-600 font-semibold' : 'text-gray-300'">
                          {{ c.real_revenue_chf > 0 ? 'CHF ' + c.real_revenue_chf.toFixed(2) : '–' }}
                        </span>
                      </td>
                      <td class="py-2.5 pr-4 text-right">
                        <span :class="c.cpa_real ? 'font-semibold text-orange-500' : 'text-gray-300'">
                          {{ c.cpa_real ? 'CHF ' + c.cpa_real.toFixed(2) : '–' }}
                        </span>
                      </td>
                      <td class="py-2.5 text-right">
                        <span
                          v-if="c.roas"
                          class="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                          :class="c.roas >= 3 ? 'bg-green-100 text-green-700' : c.roas >= 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'"
                        >{{ c.roas.toFixed(2) }}x</span>
                        <span v-else class="text-gray-300">–</span>
                      </td>
                    </tr>
                    <tr v-if="googleCampaignsTable.length === 0">
                      <td colspan="9" class="py-8 text-center text-sm text-gray-400">Keine Google Ads Daten – Credentials noch nicht konfiguriert.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- Keywords Tab -->
        <template #keywords>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Keywords (nach Ausgaben, letzte {{ days }} Tage)</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th class="pb-2 pr-4 font-semibold">Keyword</th>
                    <th class="pb-2 pr-4 font-semibold">Match</th>
                    <th class="pb-2 pr-4 font-semibold">Kampagne</th>
                    <th class="pb-2 pr-4 font-semibold text-right">Spend</th>
                    <th class="pb-2 pr-4 font-semibold text-right">Klicks</th>
                    <th class="pb-2 pr-4 font-semibold text-right">Impr.</th>
                    <th class="pb-2 pr-4 font-semibold text-right">CTR</th>
                    <th class="pb-2 pr-4 font-semibold text-right">CPC</th>
                    <th class="pb-2 font-semibold text-right">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(kw, i) in keywordsTable"
                    :key="i"
                    class="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td class="py-2.5 pr-4 font-medium text-gray-800 dark:text-gray-100">{{ kw.keyword_text }}</td>
                    <td class="py-2.5 pr-4">
                      <span class="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500 font-mono">{{ kw.match_type_short }}</span>
                    </td>
                    <td class="py-2.5 pr-4 text-gray-500 max-w-[160px] truncate text-xs">{{ kw.campaign_name }}</td>
                    <td class="py-2.5 pr-4 text-right text-gray-700">{{ kw.spend_chf > 0 ? 'CHF ' + kw.spend_chf.toFixed(2) : '–' }}</td>
                    <td class="py-2.5 pr-4 text-right text-gray-500">{{ kw.clicks }}</td>
                    <td class="py-2.5 pr-4 text-right text-gray-400">{{ kw.impressions.toLocaleString('de-CH') }}</td>
                    <td class="py-2.5 pr-4 text-right text-gray-500">{{ kw.ctr_fmt }}</td>
                    <td class="py-2.5 pr-4 text-right text-gray-500">{{ kw.cpc_fmt }}</td>
                    <td class="py-2.5 text-right">
                      <span :class="kw.conversions > 0 ? 'text-green-600 font-semibold' : 'text-gray-300'">{{ kw.conversions.toFixed(1) }}</span>
                    </td>
                  </tr>
                  <tr v-if="keywordsTable.length === 0">
                    <td colspan="9" class="py-8 text-center text-sm text-gray-400">Keine Keyword-Daten – Keywords-Sync noch nicht gelaufen.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Meta Ads -->
        <template #meta-ads>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Kampagnen Performance</h3>
            <UTable
              :rows="metaAdsCampaigns"
              :columns="metaAdsColumns"
              :empty-state="{ icon: 'i-heroicons-chart-bar', label: 'Keine Meta Ads Daten – Credentials noch nicht konfiguriert.' }"
            />
            <div v-if="data.summary.metaRealBookings > 0" class="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>{{ data.summary.metaRealBookings }}</strong> Buchungen via Meta zugeschrieben ·
              CPA CHF {{ data.summary.metaCPA?.toFixed(2) ?? '–' }} ·
              Umsatz CHF {{ data.summary.metaRealRevenue.toFixed(2) }}
            </div>
          </div>
        </template>

        <!-- GA4 -->
        <template #ga4>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Traffic nach Kanal</h3>
            <UTable
              :rows="ga4Rows"
              :columns="ga4Columns"
              :empty-state="{ icon: 'i-heroicons-chart-bar', label: 'Keine GA4 Daten – Credentials noch nicht konfiguriert.' }"
            />
          </div>
        </template>

        <!-- Search Console -->
        <template #gsc>
          <div class="mt-4">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 mb-3">Top Keywords (organisch)</h3>
            <UTable
              :rows="gscTopQueries"
              :columns="gscColumns"
              :empty-state="{ icon: 'i-heroicons-magnifying-glass', label: 'Keine Search Console Daten – Credentials noch nicht konfiguriert.' }"
            />
          </div>
        </template>

        <!-- Funnel -->
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
import { computed, ref } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const days = ref(30)
const dayOptions = [
  { label: '7 Tage', value: 7 },
  { label: '30 Tage', value: 30 },
  { label: '60 Tage', value: 60 },
  { label: '90 Tage', value: 90 },
]

const { data, pending } = await useFetch('/api/admin/marketing-analytics', {
  query: computed(() => ({ days: days.value })),
  watch: [days],
})

const tabs = [
  { label: 'Google Ads', slot: 'google-ads', icon: 'i-heroicons-magnifying-glass-circle' },
  { label: 'Keywords', slot: 'keywords', icon: 'i-heroicons-key' },
  { label: 'Meta Ads', slot: 'meta-ads', icon: 'i-heroicons-megaphone' },
  { label: 'GA4 Traffic', slot: 'ga4', icon: 'i-heroicons-chart-bar' },
  { label: 'Search Console', slot: 'gsc', icon: 'i-heroicons-magnifying-glass' },
  { label: 'Buchungsfunnel', slot: 'funnel', icon: 'i-heroicons-funnel' },
]

// ── Google Ads Campaigns ─────────────────────────────────────────────────────
const googleCampaignsTable = computed(() => {
  return (data.value?.googleAdsCampaigns ?? []).map((c: any) => ({
    ...c,
    ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) + '%' : '–',
  }))
})

// ── Keywords ─────────────────────────────────────────────────────────────────
const matchTypeShort: Record<string, string> = {
  EXACT: 'E', PHRASE: 'P', BROAD: 'B', UNSPECIFIED: '?', UNKNOWN: '?'
}
const keywordsTable = computed(() =>
  (data.value?.keywords ?? []).map((k: any) => ({
    ...k,
    match_type_short: matchTypeShort[k.match_type] ?? k.match_type,
    ctr_fmt: k.ctr > 0 ? k.ctr.toFixed(1) + '%' : '–',
    cpc_fmt: k.cpc_chf ? 'CHF ' + k.cpc_chf.toFixed(2) : '–',
  }))
)

// ── Meta Ads ─────────────────────────────────────────────────────────────────
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

// ── GA4 ──────────────────────────────────────────────────────────────────────
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

// ── Search Console ────────────────────────────────────────────────────────────
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
