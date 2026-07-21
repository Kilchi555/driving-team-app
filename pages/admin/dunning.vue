<!-- pages/admin/dunning.vue -->
<!-- Mahnwesen-Dashboard: Übersicht aller überfälligen Rechnungen mit vorgeschlagener
     nächster Mahnstufe, Einzel- und Bulk-Versand. -->

<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">

    <!-- ═══ PAGE HEADER ═══ -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Mahnwesen</h1>
        <p class="text-sm text-gray-500 mt-0.5">Überfällige Rechnungen und deren nächste Mahnstufe</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin/dunning-settings"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span class="hidden sm:inline">Vorlagen & Fristen</span>
        </NuxtLink>
        <button @click="loadOverview" :disabled="isLoading"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50 shadow-sm"
          title="Aktualisieren">
          <svg class="h-4 w-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ═══ KPI STRIP ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
      <span class="text-gray-400 text-xs font-semibold uppercase tracking-widest">{{ summary.total || 0 }} überfällig</span>
      <span class="w-px h-4 bg-gray-200 hidden sm:block"/>
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
        <span class="text-gray-500 text-xs">Aktionsbedürftig</span>
        <span class="font-semibold text-gray-900">{{ summary.actionable || 0 }}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
        <span class="text-gray-500 text-xs">Pausiert</span>
        <span class="font-semibold text-gray-900">{{ summary.paused || 0 }}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
        <span class="text-gray-500 text-xs">Total offen</span>
        <span class="font-semibold text-red-600">{{ formatChf(summary.total_outstanding_rappen) }}</span>
      </span>
    </div>

    <!-- ═══ BULK ACTION BAR ═══ -->
    <div v-if="selectedIds.length > 0" class="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <span class="text-sm font-medium text-blue-800">{{ selectedIds.length }} Rechnung(en) ausgewählt</span>
      <div class="flex items-center gap-2">
        <button @click="selectedIds = []" class="text-sm text-blue-700 hover:text-blue-900">Auswahl aufheben</button>
        <button :disabled="isBulkSending" @click="bulkSend"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50">
          {{ isBulkSending ? `Sende… (${bulkProgress.done}/${bulkProgress.total})` : 'Mahnungen für Auswahl senden' }}
        </button>
      </div>
    </div>

    <!-- ═══ TABLE ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div v-if="isLoading" class="text-center py-16 text-gray-400">Lade überfällige Rechnungen…</div>
      <div v-else-if="candidates.length === 0" class="text-center py-16">
        <p class="text-gray-400 text-sm">🎉 Keine überfälligen Rechnungen — alles im grünen Bereich.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th class="px-4 py-3 w-8">
                <input type="checkbox" class="rounded keep-checkbox" :checked="allActionableSelected" @change="toggleSelectAll">
              </th>
              <th class="px-2 py-3">Kunde / Rechnung</th>
              <th class="px-2 py-3">Fällig seit</th>
              <th class="px-2 py-3 text-right">Offener Betrag</th>
              <th class="px-2 py-3">Aktuelle Stufe</th>
              <th class="px-2 py-3">Nächste Stufe</th>
              <th class="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in candidates" :key="c.id" class="hover:bg-gray-50/60" :class="{ 'opacity-50': c.dunning_paused }">
              <td class="px-4 py-3">
                <input type="checkbox" class="rounded keep-checkbox" :disabled="!c.next_stage" :checked="selectedIds.includes(c.id)" @change="toggleSelect(c.id)">
              </td>
              <td class="px-2 py-3">
                <p class="font-medium text-gray-900">{{ c.customer_name }}</p>
                <p class="text-xs text-gray-400">{{ c.invoice_number }} · {{ c.billing_email || 'keine E-Mail' }}</p>
              </td>
              <td class="px-2 py-3">
                <p class="text-red-600 font-medium">{{ formatDate(c.due_date) }}</p>
                <p class="text-xs text-gray-400">{{ c.overdue_days }} Tage überfällig</p>
              </td>
              <td class="px-2 py-3 text-right font-semibold text-gray-900">{{ formatChf(c.outstanding_rappen) }}</td>
              <td class="px-2 py-3">
                <span v-if="c.dunning_level_label" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :style="stageBadgeStyle(c.dunning_level)">
                  {{ c.dunning_level_label }}
                </span>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-2 py-3">
                <span v-if="c.dunning_paused" class="text-xs text-gray-400 italic">Pausiert</span>
                <span v-else-if="c.next_stage_label" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :style="stageBadgeStyle(c.next_stage)">
                  {{ c.next_stage_label }}
                </span>
                <span v-else class="text-xs text-gray-400">Noch nicht fällig</span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="togglePause(c)" class="text-xs text-gray-400 hover:text-gray-600 underline">
                    {{ c.dunning_paused ? 'Reaktivieren' : 'Pausieren' }}
                  </button>
                  <button
                    v-if="c.next_stage"
                    @click="openSendDialog(c)"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                    :style="stageButtonStyle(c.next_stage)"
                  >
                    Senden
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DunningSendDialog
      :show="showSendDialog"
      :invoice-id="activeInvoice?.id || null"
      :invoice-number="activeInvoice?.invoice_number"
      :suggested-stage="activeInvoice?.next_stage"
      :current-level="activeInvoice?.dunning_level || 0"
      :last-sent-at="activeInvoice?.last_dunning_sent_at"
      @close="showSendDialog = false"
      @sent="onSent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DunningSendDialog from '~/components/admin/DunningSendDialog.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const isLoading = ref(true)
const candidates = ref<any[]>([])
const summary = ref<any>({})
const selectedIds = ref<string[]>([])
const showSendDialog = ref(false)
const activeInvoice = ref<any>(null)
const isBulkSending = ref(false)
const bulkProgress = ref({ done: 0, total: 0 })

const STAGE_COLORS: Record<number, string> = { 1: '#2563eb', 2: '#d97706', 3: '#dc2626' }

function stageBadgeStyle(stage: number) {
  const color = STAGE_COLORS[stage] || '#6b7280'
  return { background: color + '1a', color }
}
function stageButtonStyle(stage: number) {
  return { background: STAGE_COLORS[stage] || '#2563eb' }
}

function formatChf(rappen: number): string {
  return `CHF ${((rappen || 0) / 100).toFixed(2)}`
}
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const actionableIds = computed(() => candidates.value.filter(c => c.next_stage).map(c => c.id))
const allActionableSelected = computed(() => actionableIds.value.length > 0 && actionableIds.value.every(id => selectedIds.value.includes(id)))

function toggleSelectAll() {
  selectedIds.value = allActionableSelected.value ? [] : [...actionableIds.value]
}
function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

async function loadOverview() {
  isLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/dunning-overview')
    candidates.value = res.candidates || []
    summary.value = res.summary || {}
    selectedIds.value = selectedIds.value.filter(id => candidates.value.some(c => c.id === id))
  } catch (e) {
    console.error('Fehler beim Laden der Mahnwesen-Übersicht:', e)
  } finally {
    isLoading.value = false
  }
}

function openSendDialog(c: any) {
  activeInvoice.value = c
  showSendDialog.value = true
}

function onSent(invoiceId: string) {
  showSendDialog.value = false
  selectedIds.value = selectedIds.value.filter(id => id !== invoiceId)
  loadOverview()
}

async function togglePause(c: any) {
  try {
    await $fetch('/api/invoices/toggle-dunning-pause', {
      method: 'POST',
      body: { invoiceId: c.id, paused: !c.dunning_paused }
    })
    c.dunning_paused = !c.dunning_paused
  } catch (e) {
    console.error('Fehler beim Pausieren:', e)
  }
}

async function bulkSend() {
  const targets = candidates.value.filter(c => selectedIds.value.includes(c.id) && c.next_stage)
  if (targets.length === 0) return
  if (!confirm(`${targets.length} Mahnung(en) jetzt versenden?`)) return

  isBulkSending.value = true
  bulkProgress.value = { done: 0, total: targets.length }
  for (const c of targets) {
    try {
      await $fetch('/api/invoices/send-dunning', { method: 'POST', body: { invoiceId: c.id, stage: c.next_stage } })
    } catch (e) {
      console.error(`Fehler beim Versenden für Rechnung ${c.invoice_number}:`, e)
    }
    bulkProgress.value.done++
  }
  isBulkSending.value = false
  selectedIds.value = []
  await loadOverview()
}

onMounted(loadOverview)
</script>
