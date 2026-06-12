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

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Google Ads Tools - Admin' })

const cpcForm = ref({ maxCpc: 3.0, useThreshold: false, threshold: 3.0 })
const loading = ref(false)
const showConfirm = ref(false)
const cpcResult = ref<any>(null)

const resultKeywords = computed(() => {
  if (!cpcResult.value) return []
  // Dry-run returns `keywords` array of objects; live returns `keywords_updated` as strings
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
</script>
