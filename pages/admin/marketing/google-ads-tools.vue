<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Google Ads Tools</h1>
            <p class="text-xs text-gray-400 mt-0.5">Konto: 191-669-8119</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- ── Keyword Max-CPC Tool ── -->
      <div class="bg-white rounded-2xl border overflow-hidden">
        <div class="px-6 py-5 border-b">
          <h2 class="text-base font-semibold text-gray-900">Keyword Max-CPC setzen</h2>
          <p class="text-sm text-gray-500 mt-1">Setzt das Max-CPC-Gebot für alle (oder gefilterte) Keywords auf einmal.</p>
        </div>

        <div class="px-6 py-5 space-y-5">

          <!-- Max CPC input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              Neues Max-CPC-Gebot (CHF)
            </label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 font-medium">CHF</span>
              <input
                v-model.number="cpcForm.maxCpc"
                type="number"
                min="0.10"
                max="50"
                step="0.50"
                class="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <!-- Only above threshold -->
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="cpcForm.useThreshold" type="checkbox" class="rounded border-gray-300" />
              <span class="text-sm text-gray-700">Nur Keywords über CHF <input v-model.number="cpcForm.threshold" type="number" min="0" step="0.5" class="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-sm mx-1 focus:outline-none focus:ring-1 focus:ring-blue-300" /> anpassen</span>
            </label>
            <p class="text-xs text-gray-400 mt-1 ml-6">Keywords die bereits ≤ CHF {{ cpcForm.maxCpc }} haben, werden immer übersprungen.</p>
          </div>

          <!-- Buttons -->
          <div class="flex flex-wrap gap-3 pt-1">
            <button
              @click="runCpcChange(true)"
              :disabled="loading"
              class="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Vorschau (Dry-Run)
            </button>
            <button
              @click="confirmAndRun"
              :disabled="loading"
              class="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ loading ? 'Läuft…' : 'Live anwenden' }}
            </button>
          </div>
        </div>

        <!-- Confirm dialog -->
        <div v-if="showConfirm" class="mx-6 mb-5 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p class="text-sm font-semibold text-amber-900 mb-1">Bist du sicher?</p>
          <p class="text-sm text-amber-800 mb-3">
            Alle Keywords über CHF {{ cpcForm.useThreshold ? cpcForm.threshold : cpcForm.maxCpc }} werden auf
            <strong>CHF {{ cpcForm.maxCpc }}</strong> gesetzt. Dies kann nicht rückgängig gemacht werden.
          </p>
          <div class="flex gap-2">
            <button @click="runCpcChange(false)" class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              Ja, jetzt anwenden
            </button>
            <button @click="showConfirm = false" class="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Abbrechen
            </button>
          </div>
        </div>

        <!-- Result -->
        <div v-if="cpcResult" class="mx-6 mb-5">
          <!-- Error -->
          <div v-if="cpcResult.error" class="bg-red-50 border border-red-200 rounded-xl p-4">
            <p class="text-sm font-semibold text-red-800">Fehler</p>
            <p class="text-xs text-red-700 mt-1 font-mono">{{ cpcResult.error }}</p>
          </div>

          <!-- Dry-run or success -->
          <div v-else>
            <div
              class="rounded-xl p-4 mb-4"
              :class="cpcResult.dry_run ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'"
            >
              <p class="text-sm font-semibold" :class="cpcResult.dry_run ? 'text-blue-900' : 'text-green-900'">
                {{ cpcResult.dry_run ? 'Vorschau (nichts wurde geändert)' : 'Erfolgreich angewendet' }}
              </p>
              <div class="mt-1 flex flex-wrap gap-4 text-sm" :class="cpcResult.dry_run ? 'text-blue-800' : 'text-green-800'">
                <span><strong>{{ cpcResult.total_keywords ?? cpcResult.total_keywords_found }}</strong> Keywords gefunden</span>
                <span><strong>{{ cpcResult.to_update ?? cpcResult.updated }}</strong> {{ cpcResult.dry_run ? 'würden geändert' : 'geändert' }}</span>
                <span v-if="!cpcResult.dry_run && cpcResult.skipped != null"><strong>{{ cpcResult.skipped }}</strong> übersprungen (bereits ≤ CHF {{ cpcForm.maxCpc }})</span>
              </div>
            </div>

            <!-- Keywords table -->
            <div v-if="resultKeywords.length" class="border border-gray-200 rounded-xl overflow-hidden">
              <div class="max-h-80 overflow-y-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th class="px-4 py-3">Keyword</th>
                      <th class="px-4 py-3">Kampagne</th>
                      <th class="px-4 py-3">Ad Group</th>
                      <th class="px-4 py-3 text-right">Alt</th>
                      <th class="px-4 py-3 text-right">Neu</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="(kw, i) in resultKeywords" :key="i" class="hover:bg-gray-50">
                      <td class="px-4 py-2.5 font-mono text-xs text-gray-800">{{ kw.keyword }}</td>
                      <td class="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[140px]">{{ kw.campaign }}</td>
                      <td class="px-4 py-2.5 text-xs text-gray-400 truncate max-w-[120px]">{{ kw.ad_group }}</td>
                      <td class="px-4 py-2.5 text-right text-xs text-red-600 font-medium">CHF {{ kw.current_cpc_chf }}</td>
                      <td class="px-4 py-2.5 text-right text-xs text-green-700 font-semibold">CHF {{ kw.new_cpc_chf }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Kampagne erstellen ── -->
      <div class="bg-white rounded-2xl border overflow-hidden">
        <button
          @click="showCampaignForm = !showCampaignForm"
          class="w-full px-6 py-5 border-b flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div class="text-left">
            <h2 class="text-base font-semibold text-gray-900">Neue Search-Kampagne erstellen</h2>
            <p class="text-sm text-gray-500 mt-0.5">Kampagne, Ad Group, Keywords und RSA-Anzeige in einem Schritt.</p>
          </div>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform flex-shrink-0"
            :class="{ 'rotate-180': showCampaignForm }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showCampaignForm" class="px-6 py-6 space-y-6">

          <!-- Kampagnen-Grunddaten -->
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Kampagnenname</label>
              <input
                v-model="campaign.name"
                type="text"
                placeholder="z.B. Fahrschule Zürich – Auto Kat. B"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Tagesbudget (CHF)</label>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500 font-medium">CHF</span>
                <input
                  v-model.number="campaign.dailyBudget"
                  type="number" min="1" max="500" step="1"
                  class="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Geo-Targeting</label>
              <select
                v-model="campaign.geoTargetId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option v-for="(id, name) in GEO_TARGETS" :key="id" :value="id">{{ name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Final URL</label>
              <input
                v-model="campaign.finalUrl"
                type="url"
                placeholder="https://drivingteam.ch/fahrschule-zuerich/"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <!-- Keywords -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">Keywords</label>
              <button @click="addKeyword" class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Keyword hinzufügen</button>
            </div>
            <div class="space-y-2">
              <div v-for="(kw, i) in campaign.keywords" :key="i" class="flex gap-2 items-center">
                <input
                  v-model="kw.text"
                  type="text"
                  placeholder="fahrschule zürich"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <select
                  v-model="kw.match_type"
                  class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="EXACT">Exact</option>
                  <option value="PHRASE">Phrase</option>
                  <option value="BROAD">Broad</option>
                </select>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-400">CHF</span>
                  <input
                    v-model.number="kw.max_cpc_chf"
                    type="number" min="0.10" max="50" step="0.10"
                    class="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <button @click="removeKeyword(i)" class="text-gray-300 hover:text-red-500 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1">Match-Types: Exact = [keyword], Phrase = "keyword", Broad = keyword</p>
          </div>

          <!-- Headlines -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">
                Headlines <span class="text-gray-400 font-normal">({{ campaign.headlines.length }}/15, min. 3)</span>
              </label>
              <button
                v-if="campaign.headlines.length < 15"
                @click="campaign.headlines.push('')"
                class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >+ Headline</button>
            </div>
            <div class="space-y-2">
              <div v-for="(_, i) in campaign.headlines" :key="i" class="flex gap-2 items-center">
                <div class="flex-1 relative">
                  <input
                    v-model="campaign.headlines[i]"
                    type="text"
                    maxlength="30"
                    :placeholder="`Headline ${i + 1}`"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 pr-10"
                    :class="campaign.headlines[i].length > 30 ? 'border-red-400' : 'border-gray-300'"
                  />
                  <span
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                    :class="campaign.headlines[i].length > 28 ? 'text-red-500' : 'text-gray-400'"
                  >{{ campaign.headlines[i].length }}/30</span>
                </div>
                <button
                  v-if="campaign.headlines.length > 3"
                  @click="campaign.headlines.splice(i, 1)"
                  class="text-gray-300 hover:text-red-500 transition"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Descriptions -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">
                Descriptions <span class="text-gray-400 font-normal">({{ campaign.descriptions.length }}/4, min. 2)</span>
              </label>
              <button
                v-if="campaign.descriptions.length < 4"
                @click="campaign.descriptions.push('')"
                class="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >+ Description</button>
            </div>
            <div class="space-y-2">
              <div v-for="(_, i) in campaign.descriptions" :key="i" class="flex gap-2 items-center">
                <div class="flex-1 relative">
                  <input
                    v-model="campaign.descriptions[i]"
                    type="text"
                    maxlength="90"
                    :placeholder="`Description ${i + 1}`"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 pr-14"
                    :class="campaign.descriptions[i].length > 90 ? 'border-red-400' : 'border-gray-300'"
                  />
                  <span
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                    :class="campaign.descriptions[i].length > 85 ? 'text-red-500' : 'text-gray-400'"
                  >{{ campaign.descriptions[i].length }}/90</span>
                </div>
                <button
                  v-if="campaign.descriptions.length > 2"
                  @click="campaign.descriptions.splice(i, 1)"
                  class="text-gray-300 hover:text-red-500 transition"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Validation summary -->
          <div v-if="campaignValidationErrors.length" class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p class="text-xs font-semibold text-amber-800 mb-1">Bitte prüfen:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li v-for="err in campaignValidationErrors" :key="err" class="text-xs text-amber-700">{{ err }}</li>
            </ul>
          </div>

          <!-- Submit button -->
          <div class="flex flex-wrap gap-3 pt-1">
            <button
              @click="showCampaignConfirm = true"
              :disabled="campaignLoading || campaignValidationErrors.length > 0"
              class="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="campaignLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ campaignLoading ? 'Erstelle Kampagne…' : 'Kampagne erstellen (PAUSED)' }}
            </button>
          </div>

          <!-- Confirm dialog -->
          <div v-if="showCampaignConfirm" class="bg-amber-50 border border-amber-300 rounded-xl p-4">
            <p class="text-sm font-semibold text-amber-900 mb-1">Kampagne wirklich erstellen?</p>
            <p class="text-sm text-amber-800 mb-1">
              <strong>{{ campaign.name }}</strong> wird in Google Ads als <strong>PAUSED</strong> angelegt.
            </p>
            <ul class="text-xs text-amber-700 mb-3 space-y-0.5">
              <li>Budget: CHF {{ campaign.dailyBudget }}/Tag</li>
              <li>Keywords: {{ campaign.keywords.length }}</li>
              <li>Headlines: {{ campaign.headlines.length }}, Descriptions: {{ campaign.descriptions.length }}</li>
            </ul>
            <div class="flex gap-2">
              <button @click="submitCampaign" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Ja, erstellen
              </button>
              <button @click="showCampaignConfirm = false" class="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </div>

          <!-- Result -->
          <div v-if="campaignResult">
            <div v-if="campaignResult.error || !campaignResult.success" class="bg-red-50 border border-red-200 rounded-xl p-4">
              <p class="text-sm font-semibold text-red-800">Fehler beim Erstellen</p>
              <p class="text-xs text-red-700 mt-1 font-mono">{{ campaignResult.error ?? campaignResult.reason }}</p>
              <pre v-if="campaignResult.detail" class="text-xs text-red-600 mt-2 overflow-x-auto">{{ JSON.stringify(campaignResult.detail, null, 2) }}</pre>
            </div>
            <div v-else class="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p class="text-sm font-semibold text-green-900">Kampagne erstellt</p>
              <div class="text-sm text-green-800 space-y-1">
                <div class="flex gap-2"><span class="text-green-600 font-mono text-xs">Campaign ID:</span><span class="font-mono text-xs">{{ campaignResult.campaign_id }}</span></div>
                <div class="flex gap-2"><span class="text-green-600 font-mono text-xs">Ad Group ID:</span><span class="font-mono text-xs">{{ campaignResult.ad_group_id }}</span></div>
                <div class="flex gap-2"><span class="text-green-600 font-mono text-xs">Keywords:</span><span class="font-mono text-xs">{{ campaignResult.keywords_created }} erstellt</span></div>
              </div>
              <div v-if="campaignResult.geo_warning" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Geo-Targeting konnte nicht gesetzt werden (Kampagne trotzdem erstellt).
              </div>
              <a
                :href="campaignResult.google_ads_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                In Google Ads öffnen →
              </a>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Google Ads Tools - Admin' })

// ── Max-CPC Tool ────────────────────────────────────────────────────────────
const cpcForm = ref({ maxCpc: 3.0, useThreshold: false, threshold: 3.0 })
const loading = ref(false)
const showConfirm = ref(false)
const cpcResult = ref<any>(null)

const resultKeywords = computed(() => {
  if (!cpcResult.value) return []
  if (cpcResult.value.keywords && Array.isArray(cpcResult.value.keywords)) {
    return cpcResult.value.keywords
  }
  return []
})

function confirmAndRun() {
  showConfirm.value = true
}

async function runCpcChange(dryRun: boolean) {
  showConfirm.value = false
  loading.value = true
  cpcResult.value = null
  try {
    const body: Record<string, any> = {
      max_cpc_chf: cpcForm.value.maxCpc,
      dry_run: dryRun,
    }
    if (cpcForm.value.useThreshold) {
      body.only_above_chf = cpcForm.value.threshold
    }
    const res = await $fetch<any>('/api/admin/set-keyword-max-cpc', {
      method: 'POST',
      body,
    })
    cpcResult.value = res
  } catch (err: any) {
    cpcResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    loading.value = false
  }
}

// ── Campaign Creation ────────────────────────────────────────────────────────
const GEO_TARGETS: Record<string, string> = {
  'Schweiz': '2756',
  'Zürich': '20563',
  'Lachen SZ': '1003803',
  'Pfäffikon SZ': '1003888',
  'Schlieren': '1003851',
  'Uster': '1003864',
  'Dietikon': '1003815',
  'Spreitenbach': '1003857',
  'Wädenswil': '1003866',
  'Einsiedeln': '1003818',
  'Zug': '1003897',
}

const showCampaignForm = ref(false)
const showCampaignConfirm = ref(false)
const campaignLoading = ref(false)
const campaignResult = ref<any>(null)

const campaign = ref({
  name: '',
  dailyBudget: 20,
  geoTargetId: '2756',
  finalUrl: '',
  keywords: [
    { text: '', match_type: 'PHRASE' as 'EXACT' | 'PHRASE' | 'BROAD', max_cpc_chf: 3.0 },
  ],
  headlines: ['', '', ''],
  descriptions: ['', ''],
})

function addKeyword() {
  campaign.value.keywords.push({ text: '', match_type: 'PHRASE', max_cpc_chf: 3.0 })
}

function removeKeyword(index: number) {
  campaign.value.keywords.splice(index, 1)
}

const campaignValidationErrors = computed(() => {
  const errors: string[] = []
  const c = campaign.value
  if (!c.name.trim()) errors.push('Kampagnenname fehlt')
  if (!c.dailyBudget || c.dailyBudget <= 0) errors.push('Tagesbudget muss grösser als 0 sein')
  if (!c.finalUrl.startsWith('http')) errors.push('Final URL muss mit http beginnen')
  if (!c.keywords.length || c.keywords.some(k => !k.text.trim())) errors.push('Alle Keywords müssen einen Text haben')
  if (c.keywords.some(k => k.max_cpc_chf <= 0)) errors.push('Alle Max-CPC-Gebote müssen grösser als 0 sein')
  if (c.headlines.length < 3) errors.push('Mindestens 3 Headlines erforderlich')
  if (c.headlines.some(h => !h.trim())) errors.push('Alle Headlines müssen ausgefüllt sein')
  if (c.headlines.some(h => h.length > 30)) errors.push('Keine Headline darf länger als 30 Zeichen sein')
  if (c.descriptions.length < 2) errors.push('Mindestens 2 Descriptions erforderlich')
  if (c.descriptions.some(d => !d.trim())) errors.push('Alle Descriptions müssen ausgefüllt sein')
  if (c.descriptions.some(d => d.length > 90)) errors.push('Keine Description darf länger als 90 Zeichen sein')
  return errors
})

async function submitCampaign() {
  showCampaignConfirm.value = false
  campaignLoading.value = true
  campaignResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/create-google-ads-campaign', {
      method: 'POST',
      body: {
        campaign_name: campaign.value.name,
        daily_budget_chf: campaign.value.dailyBudget,
        geo_target_id: campaign.value.geoTargetId,
        final_url: campaign.value.finalUrl,
        keywords: campaign.value.keywords,
        headlines: campaign.value.headlines,
        descriptions: campaign.value.descriptions,
      },
    })
    campaignResult.value = res
  } catch (err: any) {
    campaignResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    campaignLoading.value = false
  }
}
</script>
