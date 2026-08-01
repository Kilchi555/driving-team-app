<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Korrespondenz</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ total }} Briefe · DIN-Fensterbrief wie Rechnung</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showCompose = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:opacity-90"
          :style="{ background: primaryColor }">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Brief schreiben
        </button>
        <button @click="load" :disabled="loading"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50 shadow-sm"
          title="Aktualisieren">
          <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-2.5">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input v-model="filters.q" type="text" placeholder="Referenz, Betreff, Empfänger…"
          class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
          @input="debouncedLoad" />
      </div>
      <select v-model="filters.status" class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white" @change="load">
        <option value="">Alle Status</option>
        <option value="draft">Entwurf</option>
        <option value="sent">Versendet</option>
      </select>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div v-if="loading && !rows.length" class="p-10 text-center text-sm text-gray-400">Laden…</div>
      <div v-else-if="!rows.length" class="p-10 text-center text-sm text-gray-400">Noch keine Briefe.</div>
      <div v-else class="divide-y divide-gray-50">
        <div v-for="row in rows" :key="row.id" class="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50/80">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-gray-900">{{ row.subject }}</span>
              <span class="text-xs font-mono text-gray-400">{{ row.reference_number }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="row.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                {{ row.status === 'sent' ? 'Versendet' : 'Entwurf' }}
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5 truncate">
              {{ row.billing_company_name || row.recipient_name || '—' }}
              · {{ formatDate(row.letter_date) }}
              <template v-if="row.sent_to_email"> · {{ row.sent_to_email }}</template>
            </p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="button" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-white"
              :disabled="busyId === row.id" @click="download(row)">
              PDF
            </button>
            <button v-if="row.status === 'draft'" type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
              :style="{ background: primaryColor }"
              :disabled="busyId === row.id" @click="sendDraft(row)">
              Senden
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > limit" class="flex justify-center gap-2">
      <button type="button" class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
        :disabled="page <= 1" @click="page--; load()">Zurück</button>
      <span class="text-sm text-gray-500 self-center">Seite {{ page }}</span>
      <button type="button" class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
        :disabled="page * limit >= total" @click="page++; load()">Weiter</button>
    </div>

    <CorrespondenceComposeModal
      v-if="showCompose"
      @close="showCompose = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import CorrespondenceComposeModal from '~/components/admin/CorrespondenceComposeModal.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Korrespondenz' })

const { primaryColor } = useTenantBranding()
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const loading = ref(false)
const busyId = ref('')
const showCompose = ref(false)
const filters = ref({ q: '', status: '' })
let debounce: ReturnType<typeof setTimeout> | null = null

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('de-CH')
  } catch { return d }
}

function debouncedLoad() {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 1; load() }, 280)
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ data: any[]; total: number }>('/api/correspondence/list', {
      query: {
        page: page.value,
        limit,
        q: filters.value.q || undefined,
        status: filters.value.status || undefined,
      },
    })
    rows.value = res.data || []
    total.value = res.total || 0
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function download(row: any) {
  busyId.value = row.id
  try {
    const res = await $fetch<{ pdfUrl: string }>('/api/correspondence/download', {
      method: 'POST',
      body: { id: row.id },
    })
    if (res.pdfUrl) window.open(res.pdfUrl, '_blank')
  } catch (e: any) {
    alert(e?.data?.statusMessage || e?.message || 'Download fehlgeschlagen')
  } finally {
    busyId.value = ''
  }
}

async function sendDraft(row: any) {
  busyId.value = row.id
  try {
    await $fetch('/api/correspondence/send', {
      method: 'POST',
      body: { id: row.id, send_email: true },
    })
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || e?.message || 'Senden fehlgeschlagen')
  } finally {
    busyId.value = ''
  }
}

function onSaved() {
  showCompose.value = false
  load()
}

onMounted(load)
</script>
