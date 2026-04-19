<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-full items-start justify-center p-4 pt-8">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" @click="close" />

      <div class="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white">CAMT-Datei importieren</h2>
              <p class="text-xs text-blue-100">Zahlungseingänge automatisch mit Rechnungen abgleichen</p>
            </div>
          </div>
          <button @click="close" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <!-- Step 1: Upload -->
          <div v-if="step === 'upload'">
            <div
              class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-400 transition-colors cursor-pointer"
              :class="{ 'border-blue-400 bg-blue-50': isDragging }"
              @click="fileInput?.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
            >
              <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-base font-medium text-gray-700 mb-1">CAMT.053 oder CAMT.054 XML hochladen</p>
              <p class="text-sm text-gray-400">Datei hierher ziehen oder klicken zum Auswählen</p>
              <p class="text-xs text-gray-400 mt-2">Erhältlich im E-Banking unter "Kontoauszug Export" → XML/ISO 20022</p>
            </div>
            <input ref="fileInput" type="file" accept=".xml,.camt" class="hidden" @change="onFileSelect" />

            <div v-if="uploadError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ uploadError }}
            </div>
          </div>

          <!-- Step 2: Parsing / Loading -->
          <div v-else-if="step === 'parsing'" class="flex flex-col items-center py-16 gap-4">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p class="text-gray-600 font-medium">Datei wird analysiert und Rechnungen abgeglichen…</p>
          </div>

          <!-- Step 3: Results -->
          <div v-else-if="step === 'results'">
            <!-- Zusammenfassung -->
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-blue-50 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-blue-700">{{ results.length }}</div>
                <div class="text-xs text-blue-600 mt-1">Einträge gefunden</div>
              </div>
              <div class="bg-green-50 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-green-700">{{ autoMatched.length }}</div>
                <div class="text-xs text-green-600 mt-1">Automatisch gematcht (≥65%)</div>
              </div>
              <div class="bg-orange-50 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-orange-600">{{ unmatched.length }}</div>
                <div class="text-xs text-orange-600 mt-1">Nicht zugeordnet</div>
              </div>
            </div>

            <!-- Tabelle -->
            <div class="overflow-x-auto rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th class="px-3 py-2.5 text-left w-8">
                      <input type="checkbox" :checked="allSelected" @change="toggleAll" class="rounded" />
                    </th>
                    <th class="px-3 py-2.5 text-left">Datum</th>
                    <th class="px-3 py-2.5 text-left">Auftraggeber</th>
                    <th class="px-3 py-2.5 text-left">Referenz / Mitteilung</th>
                    <th class="px-3 py-2.5 text-right">Betrag</th>
                    <th class="px-3 py-2.5 text-left">Rechnung</th>
                    <th class="px-3 py-2.5 text-center">Konfidenz</th>
                    <th class="px-3 py-2.5 text-left">Zuordnung</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(r, i) in results" :key="i" :class="[rowBg(r), 'hover:bg-gray-50/50']">
                    <!-- Checkbox -->
                    <td class="px-3 py-3">
                      <input
                        type="checkbox"
                        :checked="selected.has(i)"
                        :disabled="!r.invoice_id"
                        @change="toggleSelect(i, r)"
                        class="rounded"
                      />
                    </td>
                    <!-- Datum -->
                    <td class="px-3 py-3 whitespace-nowrap text-gray-700 font-mono text-xs">{{ r.entry.date }}</td>
                    <!-- Auftraggeber -->
                    <td class="px-3 py-3">
                      <div class="font-medium text-gray-800 text-xs">{{ r.entry.debtor_name || '—' }}</div>
                      <div v-if="r.entry.iban" class="text-gray-400 text-xs font-mono">{{ r.entry.iban }}</div>
                    </td>
                    <!-- Referenz -->
                    <td class="px-3 py-3 max-w-xs">
                      <div class="text-xs text-gray-600 truncate" :title="r.entry.reference_raw || r.entry.remittance_info">
                        {{ r.entry.reference_raw || r.entry.remittance_info || '—' }}
                      </div>
                    </td>
                    <!-- Betrag -->
                    <td class="px-3 py-3 text-right font-bold text-gray-800 whitespace-nowrap">
                      {{ chf(r.entry.amount_rappen) }}
                    </td>
                    <!-- Rechnung -->
                    <td class="px-3 py-3">
                      <div v-if="r.invoice_id">
                        <div class="font-semibold text-gray-800 text-xs">{{ r.invoice_number }}</div>
                        <div class="text-gray-500 text-xs">{{ r.customer_name }}</div>
                        <div v-if="r.invoice_total !== r.entry.amount_rappen" class="text-xs text-orange-600 mt-0.5">
                          Rg: {{ chf(r.invoice_total || 0) }}
                        </div>
                      </div>
                      <!-- Manuelle Zuweisung -->
                      <select
                        v-else
                        v-model="manualAssignment[i]"
                        @change="onManualAssign(i, r)"
                        class="text-xs border border-gray-300 rounded-lg px-2 py-1 w-44 bg-white"
                      >
                        <option value="">— Rechnung wählen —</option>
                        <option v-for="inv in openInvoices" :key="inv.id" :value="inv.id">
                          {{ inv.invoice_number }} – {{ inv.customer_name }} ({{ chf(inv.total_amount_rappen) }})
                        </option>
                      </select>
                    </td>
                    <!-- Konfidenz -->
                    <td class="px-3 py-3 text-center">
                      <span v-if="r.confidence >= 90" class="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        {{ r.confidence }}%
                      </span>
                      <span v-else-if="r.confidence >= 65" class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{{ r.confidence }}%</span>
                      <span v-else-if="r.confidence > 0" class="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{{ r.confidence }}%</span>
                      <span v-else class="text-xs text-gray-400">—</span>
                    </td>
                    <!-- Match-Typ -->
                    <td class="px-3 py-3">
                      <span v-if="r.match_type === 'exact_ref'" class="text-xs text-green-600">Referenznummer</span>
                      <span v-else-if="r.match_type === 'invoice_number'" class="text-xs text-blue-600">Rechnungsnummer</span>
                      <span v-else-if="r.match_type === 'amount_name'" class="text-xs text-orange-500">Betrag + Name</span>
                      <span v-else class="text-xs text-gray-400">Nicht erkannt</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Fusszeile Aktionen -->
            <div class="mt-5 flex items-center justify-between">
              <div class="text-sm text-gray-600">
                <span class="font-semibold text-gray-800">{{ selected.size }}</span> Einträge ausgewählt
                <span v-if="selected.size > 0" class="ml-2 text-gray-500">
                  = {{ chf(selectedTotal) }}
                </span>
              </div>
              <div class="flex gap-3">
                <button
                  @click="resetUpload"
                  class="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  Neue Datei
                </button>
                <button
                  @click="confirmPayments"
                  :disabled="selected.size === 0 || isConfirming"
                  class="px-5 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg v-if="isConfirming" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {{ selected.size }} Rechnung{{ selected.size !== 1 ? 'en' : '' }} als bezahlt markieren
                </button>
              </div>
            </div>

            <div v-if="confirmError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ confirmError }}
            </div>
          </div>

          <!-- Step 4: Abgeschlossen -->
          <div v-else-if="step === 'done'" class="flex flex-col items-center py-12 gap-4 text-center">
            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800">{{ confirmedCount }} Rechnung{{ confirmedCount !== 1 ? 'en' : '' }} als bezahlt markiert</h3>
            <p class="text-gray-500 text-sm">Die Rechnungen wurden erfolgreich auf "Bezahlt" gesetzt.</p>
            <div class="flex gap-3 mt-2">
              <button @click="resetUpload" class="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                Weitere Datei importieren
              </button>
              <button @click="close" class="px-5 py-2 text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700">
                Fertig
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'done'): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const step = ref<'upload' | 'parsing' | 'results' | 'done'>('upload')
const uploadError = ref<string | null>(null)
const confirmError = ref<string | null>(null)
const isConfirming = ref(false)
const confirmedCount = ref(0)

const results = ref<any[]>([])
const openInvoices = ref<any[]>([])
const selected = ref(new Set<number>())
const manualAssignment = ref<Record<number, string>>({})

function chf(rappen: number) {
  return `CHF ${((rappen || 0) / 100).toFixed(2)}`
}

const autoMatched = computed(() => results.value.filter(r => r.confidence >= 65 && r.invoice_id))
const unmatched = computed(() => results.value.filter(r => !r.invoice_id && !manualAssignment.value[results.value.indexOf(r)]))

const allSelected = computed(() =>
  results.value.filter(r => r.invoice_id).length > 0 &&
  results.value.every((r, i) => !r.invoice_id || selected.value.has(i))
)

const selectedTotal = computed(() =>
  [...selected.value].reduce((sum, i) => sum + (results.value[i]?.entry?.amount_rappen || 0), 0)
)

function toggleAll() {
  if (allSelected.value) {
    selected.value.clear()
  } else {
    results.value.forEach((r, i) => { if (r.invoice_id) selected.value.add(i) })
  }
  selected.value = new Set(selected.value) // trigger reactivity
}

function toggleSelect(i: number, r: any) {
  if (!r.invoice_id) return
  const s = new Set(selected.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  selected.value = s
}

function onManualAssign(i: number, r: any) {
  const invId = manualAssignment.value[i]
  if (!invId) return
  const inv = openInvoices.value.find(x => x.id === invId)
  if (!inv) return
  r.invoice_id = inv.id
  r.invoice_number = inv.invoice_number
  r.invoice_total = inv.total_amount_rappen
  r.customer_name = inv.customer_name
  r.match_type = 'invoice_number'
  r.confidence = 50
  const s = new Set(selected.value)
  s.add(i)
  selected.value = s
}

function rowBg(r: any) {
  if (r.confidence >= 90) return 'bg-green-50/40'
  if (r.confidence >= 65) return 'bg-blue-50/30'
  if (r.confidence > 0) return 'bg-orange-50/30'
  return ''
}

async function processFile(content: string) {
  uploadError.value = null
  step.value = 'parsing'
  try {
    const data = await $fetch<any>('/api/invoices/camt-import', {
      method: 'POST',
      body: { xml_content: content },
    })
    results.value = data.results
    openInvoices.value = data.open_invoices

    // Auto-select hochkonfidente Matches
    const s = new Set<number>()
    data.results.forEach((r: any, i: number) => {
      if (r.confidence >= 65 && r.invoice_id) s.add(i)
    })
    selected.value = s
    step.value = 'results'
  } catch (err: any) {
    uploadError.value = err?.data?.statusMessage || err?.message || 'Fehler beim Analysieren der Datei'
    step.value = 'upload'
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) readFile(file)
}

function readFile(file: File) {
  if (!file.name.match(/\.(xml|camt)$/i)) {
    uploadError.value = 'Bitte eine XML- oder CAMT-Datei auswählen'
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => processFile(e.target?.result as string)
  reader.readAsText(file, 'UTF-8')
}

async function confirmPayments() {
  if (selected.value.size === 0) return
  isConfirming.value = true
  confirmError.value = null
  let count = 0

  for (const i of selected.value) {
    const r = results.value[i]
    if (!r.invoice_id) continue
    try {
      await $fetch('/api/invoices/mark-invoice-paid', {
        method: 'POST',
        body: {
          invoice_id: r.invoice_id,
          paid_at: r.entry.date ? new Date(r.entry.date).toISOString() : undefined,
          paid_amount_rappen: r.entry.amount_rappen,
          note: `CAMT-Import: ${r.entry.reference_raw || r.entry.remittance_info || ''}`.trim(),
        },
      })
      count++
    } catch (err: any) {
      confirmError.value = `Fehler bei Rechnung ${r.invoice_number}: ${err?.data?.statusMessage || err?.message}`
    }
  }

  isConfirming.value = false
  confirmedCount.value = count
  step.value = 'done'
  emit('done')
}

function resetUpload() {
  step.value = 'upload'
  results.value = []
  selected.value = new Set()
  manualAssignment.value = {}
  uploadError.value = null
  confirmError.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function close() {
  emit('update:modelValue', false)
  resetUpload()
}

watch(() => props.modelValue, (v) => { if (!v) resetUpload() })
</script>
