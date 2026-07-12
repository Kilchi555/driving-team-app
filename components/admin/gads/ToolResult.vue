<template>
  <div v-if="result" :class="compact ? 'px-5 pb-4' : 'px-6 pb-5'">

    <!-- Error -->
    <div v-if="result.error" class="bg-red-50 border border-red-200 rounded-xl p-4 mt-3">
      <p class="text-xs font-semibold text-red-800">Fehler</p>
      <p class="text-xs text-red-700 mt-1 font-mono break-all">{{ result.error }}</p>
      <pre v-if="result.detail" class="text-xs text-red-600 mt-2 overflow-x-auto max-h-40">{{ JSON.stringify(result.detail, null, 2) }}</pre>
    </div>

    <!-- Dry-run / Success -->
    <div v-else class="mt-3">
      <div
        class="rounded-xl p-4"
        :class="result.dry_run ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'"
      >
        <div class="flex items-center justify-between flex-wrap gap-2">
          <p class="text-xs font-semibold" :class="result.dry_run ? 'text-blue-900' : 'text-green-900'">
            {{ result.dry_run ? 'Vorschau (nichts geändert)' : 'Erfolgreich' }}
          </p>
          <a v-if="result.google_ads_url" :href="result.google_ads_url" target="_blank" rel="noopener noreferrer"
            class="text-xs font-medium text-blue-700 hover:text-blue-900 underline">
            In Google Ads öffnen →
          </a>
        </div>

        <!-- Key-value summary -->
        <dl v-if="summaryEntries.length" class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
          <div v-for="[key, val] in summaryEntries" :key="key" class="text-xs" :class="result.dry_run ? 'text-blue-800' : 'text-green-800'">
            <dt class="font-medium opacity-70">{{ key }}</dt>
            <dd class="font-semibold">{{ val }}</dd>
          </div>
        </dl>

        <!-- Next steps -->
        <ul v-if="result.next_steps?.length" class="mt-3 space-y-1">
          <li v-for="step in result.next_steps" :key="step" class="text-xs flex items-start gap-1.5"
            :class="result.dry_run ? 'text-blue-700' : 'text-green-700'">
            <svg class="w-3 h-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ step }}
          </li>
        </ul>
      </div>

      <!-- Keywords table (for CPC / keyword results) -->
      <div v-if="resultKeywords.length" class="border border-gray-200 rounded-xl overflow-hidden mt-3">
        <div class="max-h-60 overflow-y-auto">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 sticky top-0">
              <tr class="text-left font-semibold text-gray-500 uppercase tracking-wide">
                <th class="px-3 py-2">Keyword</th>
                <th class="px-3 py-2">Kampagne</th>
                <th class="px-3 py-2 text-right">Alt</th>
                <th class="px-3 py-2 text-right">Neu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(kw, i) in resultKeywords" :key="i" class="hover:bg-gray-50">
                <td class="px-3 py-2 font-mono text-gray-800">{{ kw.keyword }}</td>
                <td class="px-3 py-2 text-gray-500 truncate max-w-[140px]">{{ kw.campaign }}</td>
                <td class="px-3 py-2 text-right text-red-600 font-medium">{{ kw.current_cpc_chf ? `CHF ${kw.current_cpc_chf}` : '—' }}</td>
                <td class="px-3 py-2 text-right text-green-700 font-semibold">{{ kw.new_cpc_chf ? `CHF ${kw.new_cpc_chf}` : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Generic raw result (small) -->
      <details v-if="!summaryEntries.length && !resultKeywords.length" class="mt-2">
        <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Rohdaten anzeigen</summary>
        <pre class="text-xs text-gray-600 mt-1 overflow-x-auto max-h-48 bg-gray-50 rounded-lg p-3">{{ JSON.stringify(result, null, 2) }}</pre>
      </details>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  result: any
  compact?: boolean
}>()

// Summary key→value pairs to highlight (exclude arrays and verbose fields)
const SUMMARY_KEYS: Record<string, string> = {
  campaign_name: 'Kampagne',
  campaign_id: 'Campaign ID',
  offer: 'Angebot',
  location: 'Standort',
  landing_page: 'Landing Page',
  budget_chf_day: 'Budget/Tag',
  keywords_count: 'Keywords',
  total_keywords: 'Keywords',
  to_update: 'Zu ändern',
  updated: 'Geändert',
  skipped: 'Übersprungen',
  added: 'Hinzugefügt',
  sample_headline_1: 'Headline 1',
  sample_headline_2: 'Headline 2',
}

const summaryEntries = computed<[string, any][]>(() => {
  if (!props.result || props.result.error) return []
  return Object.entries(SUMMARY_KEYS)
    .filter(([key]) => props.result[key] != null)
    .map(([key, label]) => [label, props.result[key]])
})

const resultKeywords = computed(() => {
  if (!props.result) return []
  if (Array.isArray(props.result.keywords)) return props.result.keywords
  return []
})
</script>
