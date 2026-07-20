<!-- components/admin/DunningSendDialog.vue -->
<!-- Vorschau- & Versand-Dialog für eine einzelne Zahlungserinnerung/Mahnung.
     Wird sowohl vom Mahnwesen-Dashboard als auch vom InvoiceDetailModal verwendet. -->

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-900/60" @click="close" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden">

        <div class="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Mahnung senden</h3>
            <p class="text-xs text-gray-500 mt-0.5">Rechnung {{ invoiceNumber }}</p>
          </div>
          <button class="p-1.5 text-gray-400 hover:text-gray-600" @click="close">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <!-- Stufenwahl -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Mahnstufe</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="def in availableStages" :key="def.stage"
                @click="selectStage(def.stage)"
                :disabled="isLoadingPreview"
                class="px-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors"
                :class="stage === def.stage
                  ? 'text-white shadow-sm border-transparent'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
                :style="stage === def.stage ? { background: def.color } : {}"
              >
                {{ def.label }}
              </button>
            </div>
          </div>

          <div v-if="isLoadingPreview" class="text-center py-10 text-sm text-gray-400">Lade Vorschau…</div>

          <template v-else-if="preview">
            <!-- Zahlungsübersicht -->
            <div class="rounded-xl border border-gray-200 overflow-hidden">
              <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 bg-gray-50 text-center">
                <div class="px-2 py-2.5">
                  <p class="text-[10px] uppercase tracking-wide text-gray-400">Offen</p>
                  <p class="text-sm font-semibold text-gray-900">{{ formatChf(preview.outstandingRappen) }}</p>
                </div>
                <div class="px-2 py-2.5">
                  <p class="text-[10px] uppercase tracking-wide text-gray-400">Überfällig</p>
                  <p class="text-sm font-semibold text-gray-900">{{ preview.overdueDays }} Tage</p>
                </div>
                <div class="px-2 py-2.5">
                  <p class="text-[10px] uppercase tracking-wide text-gray-400">Mahngebühr</p>
                  <p class="text-sm font-semibold text-gray-900">{{ formatChf(feeRappen) }}</p>
                </div>
                <div class="px-2 py-2.5">
                  <p class="text-[10px] uppercase tracking-wide text-gray-400">Total fällig</p>
                  <p class="text-sm font-bold" :style="{ color: stageColor }">{{ formatChf((preview.outstandingRappen || 0) + feeRappen + (preview.interestRappen || 0)) }}</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Mahngebühr anpassen (CHF)</label>
                <input :value="rappenToChf(feeRappen)" @change="e => feeRappen = chfToRappen((e.target as HTMLInputElement).value)"
                  type="number" min="0" step="0.05"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              </div>
              <div class="flex items-end">
                <button @click="refreshPreview" class="text-xs font-medium text-blue-600 hover:text-blue-700 underline">
                  Text anhand Gebühr aktualisieren
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Empfänger</label>
              <p class="text-sm text-gray-800">{{ preview.billingEmail }}</p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Betreff</label>
              <input v-model="editedSubject" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Text</label>
              <textarea v-model="editedBody" rows="9" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            </div>
          </template>

          <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        </div>

        <div class="flex-none flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button class="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50" @click="close">Abbrechen</button>
          <button
            :disabled="isSending || isLoadingPreview || !preview"
            @click="confirmSend"
            class="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm disabled:opacity-50"
            :style="{ background: stageColor }"
          >
            {{ isSending ? 'Wird versendet…' : `${stageLabel} jetzt senden` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  show: boolean
  invoiceId: string | null
  invoiceNumber?: string
  suggestedStage?: number | null
  currentLevel?: number
}>()

const emit = defineEmits<{
  close: []
  sent: [invoiceId: string, stage: number]
}>()

const STAGE_DEFS = [
  { stage: 1, label: 'Zahlungserinnerung', color: '#2563eb' },
  { stage: 2, label: '1. Mahnung', color: '#d97706' },
  { stage: 3, label: '2. / letzte Mahnung', color: '#dc2626' },
]

const stage = ref(1)
const feeRappen = ref(0)
const preview = ref<any>(null)
const isLoadingPreview = ref(false)
const isSending = ref(false)
const errorMsg = ref('')
const editedSubject = ref('')
const editedBody = ref('')

// Mahnstufen müssen strikt sequenziell durchlaufen werden (siehe
// suggestedNextStage() in server/utils/invoice-dunning.ts und die serverseitige
// Validierung in send-dunning.post.ts): egal wie lange eine Rechnung überfällig
// ist, es ist immer nur genau currentLevel + 1 zulässig — nie eine höhere Stufe
// überspringen. Nur an der letzten Stufe darf dieselbe Stufe erneut gewählt
// werden. Daher bietet dieser Dialog auch nur genau eine Option an, statt aller
// theoretisch höheren Stufen.
const availableStages = computed(() => {
  const currentLevel = props.currentLevel || 0
  const maxStageDef = STAGE_DEFS[STAGE_DEFS.length - 1]
  const nextDef = STAGE_DEFS.find(d => d.stage === currentLevel + 1)
  if (nextDef) return [nextDef]
  return [maxStageDef]
})
const stageColor = computed(() => STAGE_DEFS.find(d => d.stage === stage.value)?.color || '#2563eb')
const stageLabel = computed(() => STAGE_DEFS.find(d => d.stage === stage.value)?.label || 'Mahnung')

function formatChf(rappen: number): string {
  return `CHF ${((rappen || 0) / 100).toFixed(2)}`
}
function rappenToChf(rappen: number): string {
  return ((rappen || 0) / 100).toFixed(2)
}
function chfToRappen(value: string): number {
  return Math.round((parseFloat(value) || 0) * 100)
}

async function loadPreview() {
  if (!props.invoiceId) return
  isLoadingPreview.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<any>('/api/invoices/dunning-preview', {
      method: 'POST',
      body: { invoiceId: props.invoiceId, stage: stage.value }
    })
    preview.value = res
    feeRappen.value = res.feeRappen
    editedSubject.value = res.subject
    editedBody.value = res.bodyText
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Vorschau konnte nicht geladen werden'
    preview.value = null
  } finally {
    isLoadingPreview.value = false
  }
}

async function refreshPreview() {
  if (!props.invoiceId) return
  isLoadingPreview.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<any>('/api/invoices/dunning-preview', {
      method: 'POST',
      body: { invoiceId: props.invoiceId, stage: stage.value, overrideFeeRappen: feeRappen.value }
    })
    preview.value = res
    editedSubject.value = res.subject
    editedBody.value = res.bodyText
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Vorschau konnte nicht aktualisiert werden'
  } finally {
    isLoadingPreview.value = false
  }
}

function selectStage(newStage: number) {
  stage.value = newStage
  loadPreview()
}

async function confirmSend() {
  if (!props.invoiceId) return
  isSending.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/invoices/send-dunning', {
      method: 'POST',
      body: {
        invoiceId: props.invoiceId,
        stage: stage.value,
        overrideSubject: editedSubject.value,
        overrideBody: editedBody.value,
        overrideFeeRappen: feeRappen.value,
      }
    })
    emit('sent', props.invoiceId, stage.value)
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Mahnung konnte nicht versendet werden'
  } finally {
    isSending.value = false
  }
}

function close() {
  emit('close')
}

watch(() => props.show, (val) => {
  if (val && props.invoiceId) {
    stage.value = props.suggestedStage || availableStages.value[0]?.stage || 1
    loadPreview()
  } else {
    preview.value = null
    errorMsg.value = ''
  }
})
</script>
