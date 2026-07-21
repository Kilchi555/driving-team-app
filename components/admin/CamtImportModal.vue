<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-full items-start justify-center p-4 pt-8">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" @click="close" />

      <div class="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200" :style="{ background: headerGradient }">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white">Zahlungen importieren</h2>
              <p class="text-xs text-white/80">CAMT- oder CSV-Kontoauszug automatisch mit Rechnungen abgleichen</p>
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
              <p class="text-base font-medium text-gray-700 mb-1">CAMT.053/054-XML oder Bank-CSV hochladen</p>
              <p class="text-sm text-gray-400">Datei hierher ziehen oder klicken zum Auswählen</p>
              <p class="text-xs text-gray-400 mt-2">CAMT: E-Banking → "Kontoauszug Export" → XML/ISO 20022 &nbsp;·&nbsp; CSV: Export als Tabelle/Excel-CSV</p>
            </div>
            <input ref="fileInput" type="file" accept=".xml,.camt,.csv,.txt" class="hidden" @change="onFileSelect" />

            <div v-if="uploadError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ uploadError }}
            </div>
          </div>

          <!-- Step 1.5 (nur CSV): Spalten-Zuordnung -->
          <div v-else-if="step === 'mapping'">
            <p class="text-sm text-gray-600 mb-4">
              Ordne die Spalten deiner CSV-Datei den benötigten Feldern zu. Wir haben eine Vorauswahl anhand der Spaltentitel getroffen — bitte prüfen.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Datum <span class="text-red-500">*</span></label>
                <select v-model="csvMapping.date" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="">— wählen —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Referenz (QR/ESR, falls vorhanden)</label>
                <select v-model="csvMapping.reference" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="">— keine —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>

              <div v-if="!csvUseSeparateCredit">
                <label class="block text-xs font-semibold text-gray-600 mb-1">Betrag (positiv = Gutschrift) <span class="text-red-500">*</span></label>
                <select v-model="csvMapping.amount" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="">— wählen —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <template v-else>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Gutschrift-Spalte <span class="text-red-500">*</span></label>
                  <select v-model="csvMapping.credit" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                    <option value="">— wählen —</option>
                    <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Lastschrift-Spalte (optional)</label>
                  <select v-model="csvMapping.debit" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                    <option value="">— keine —</option>
                    <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                  </select>
                </div>
              </template>

              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Auftraggeber / Zahler</label>
                <select v-model="csvMapping.debtor_name" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="">— keine —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Buchungstext / Mitteilung</label>
                <select v-model="csvMapping.description" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="">— keine —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Bank-Transaktions-ID (optional, für Duplikat-Schutz)</label>
                <select v-model="csvMapping.transaction_id" class="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
                  <option value="">— keine —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
              </div>
            </div>

            <label class="flex items-center gap-2 text-xs text-gray-600 mb-5">
              <input type="checkbox" v-model="csvUseSeparateCredit" class="rounded" />
              Meine Bank hat getrennte Spalten für Gutschrift/Lastschrift statt einer einzelnen Betragsspalte
            </label>

            <!-- Vorschau -->
            <div v-if="csvPreviewRows.length > 0" class="overflow-x-auto rounded-xl border border-gray-200 mb-5">
              <table class="w-full text-xs">
                <thead class="bg-gray-50 text-gray-500">
                  <tr>
                    <th v-for="h in csvHeaders" :key="h" class="px-2.5 py-2 text-left font-medium whitespace-nowrap">{{ h }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="(row, ri) in csvPreviewRows" :key="ri">
                    <td v-for="(cell, ci) in row" :key="ci" class="px-2.5 py-1.5 text-gray-600 whitespace-nowrap max-w-[160px] truncate">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="uploadError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ uploadError }}
            </div>

            <div class="flex items-center justify-between">
              <button @click="resetUpload" class="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                Zurück
              </button>
              <button
                @click="submitCsvImport"
                :disabled="!csvMappingValid"
                :style="csvMappingValid ? { background: primaryColor } : {}"
                class="px-5 py-2 text-sm font-medium rounded-xl text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Import starten
              </button>
            </div>
          </div>

          <!-- Step 2: Parsing / Loading -->
          <div v-else-if="step === 'parsing'" class="flex flex-col items-center py-16 gap-4">
            <div class="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" :style="{ borderColor: primaryColor, borderTopColor: 'transparent' }" />
            <p class="text-gray-600 font-medium">Datei wird analysiert und Rechnungen abgeglichen…</p>
          </div>

          <!-- Step 3: Results -->
          <div v-else-if="step === 'results'">
            <!-- Zusammenfassung -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
              <div v-if="alreadyImported.length > 0" class="bg-gray-100 rounded-xl p-4 text-center">
                <div class="text-2xl font-bold text-gray-600">{{ alreadyImported.length }}</div>
                <div class="text-xs text-gray-500 mt-1">Bereits importiert</div>
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
                  <tr v-for="(r, i) in results" :key="i" :class="[rowBg(r), 'hover:bg-gray-50/50', r.already_imported ? 'opacity-50' : '']">
                    <!-- Checkbox -->
                    <td class="px-3 py-3">
                      <input
                        type="checkbox"
                        :checked="selected.has(i)"
                        :disabled="!r.invoice_id || r.already_imported"
                        @change="toggleSelect(i, r)"
                        class="rounded"
                      />
                    </td>
                    <!-- Datum -->
                    <td class="px-3 py-3 whitespace-nowrap text-gray-700 font-mono text-xs">{{ r.entry.date || '—' }}</td>
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
                      <div v-if="r.invoice_id" class="mb-1">
                        <div class="font-semibold text-gray-800 text-xs">{{ r.invoice_number }}</div>
                        <div class="text-gray-500 text-xs">{{ r.customer_name }}</div>
                        <div v-if="r.invoice_total !== r.entry.amount_rappen" class="text-xs text-orange-600 mt-0.5">
                          Rg: {{ chf(r.invoice_total || 0) }}
                        </div>
                      </div>
                      <div v-else-if="r.match_type === 'ambiguous'" class="text-xs text-orange-600 mb-1">
                        Mehrere Rechnungen mit gleichem Betrag — bitte manuell wählen
                      </div>
                      <!-- Manuelle Zuweisung / Korrektur eines Auto-Matches -->
                      <select
                        v-if="!r.already_imported"
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
                      <span v-if="r.already_imported" class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        Bereits importiert
                      </span>
                      <span v-else-if="r.confidence >= 90" class="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
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
                      <span v-else-if="r.match_type === 'ambiguous'" class="text-xs text-orange-600 font-medium">Mehrdeutig</span>
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
              <button @click="close" :style="{ background: primaryColor }" class="px-5 py-2 text-sm font-medium rounded-xl text-white hover:opacity-90">
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

const { primaryColor } = useTenantBranding()

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt((hex || '#2563EB').replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

const headerGradient = computed(() => {
  const start = primaryColor.value || '#2563EB'
  const end = adjustBrightness(start, -30)
  return `linear-gradient(to right, ${start}, ${end})`
})

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const step = ref<'upload' | 'mapping' | 'parsing' | 'results' | 'done'>('upload')
const uploadError = ref<string | null>(null)
const confirmError = ref<string | null>(null)
const isConfirming = ref(false)
const confirmedCount = ref(0)
const sourceType = ref<'camt' | 'csv'>('camt')

const results = ref<any[]>([])
const openInvoices = ref<any[]>([])
const selected = ref(new Set<number>())
const manualAssignment = ref<Record<number, string>>({})

// CSV-spezifischer Zwischenschritt: Spalten-Zuordnung vor dem eigentlichen Import
const csvContent = ref('')
const csvHeaders = ref<string[]>([])
const csvPreviewRows = ref<string[][]>([])
const csvUseSeparateCredit = ref(false)
const csvMapping = ref<Record<string, string>>({
  date: '', amount: '', credit: '', debit: '', reference: '', description: '', debtor_name: '', transaction_id: '',
})

const csvMappingValid = computed(() =>
  !!csvMapping.value.date && (csvUseSeparateCredit.value ? !!csvMapping.value.credit : !!csvMapping.value.amount)
)

function chf(rappen: number) {
  return `CHF ${((rappen || 0) / 100).toFixed(2)}`
}

const autoMatched = computed(() => results.value.filter(r => r.confidence >= 65 && r.invoice_id && !r.already_imported))
const unmatched = computed(() => results.value.filter(r => !r.invoice_id && !r.already_imported))
const alreadyImported = computed(() => results.value.filter(r => r.already_imported))

const allSelected = computed(() =>
  results.value.filter(r => r.invoice_id && !r.already_imported).length > 0 &&
  results.value.every((r, i) => !r.invoice_id || r.already_imported || selected.value.has(i))
)

const selectedTotal = computed(() =>
  [...selected.value].reduce((sum, i) => sum + (results.value[i]?.entry?.amount_rappen || 0), 0)
)

function toggleAll() {
  if (allSelected.value) {
    selected.value.clear()
  } else {
    results.value.forEach((r, i) => { if (r.invoice_id && !r.already_imported) selected.value.add(i) })
  }
  selected.value = new Set(selected.value) // trigger reactivity
}

function toggleSelect(i: number, r: any) {
  if (!r.invoice_id || r.already_imported) return
  const s = new Set(selected.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  selected.value = s
}

// Manuelle Zuweisung — auch nutzbar, um einen bereits vorhandenen (ggf.
// falschen) Auto-Match zu korrigieren, da die Auswahl immer angezeigt wird.
function onManualAssign(i: number, r: any) {
  const invId = manualAssignment.value[i]
  const s = new Set(selected.value)
  if (!invId) {
    // Zuweisung entfernt → Zeile wieder unzugeordnet
    r.invoice_id = undefined
    r.invoice_number = undefined
    r.invoice_total = undefined
    r.customer_name = undefined
    r.match_type = 'none'
    r.confidence = 0
    s.delete(i)
    selected.value = s
    return
  }
  const inv = openInvoices.value.find(x => x.id === invId)
  if (!inv) return
  r.invoice_id = inv.id
  r.invoice_number = inv.invoice_number
  r.invoice_total = inv.total_amount_rappen
  r.customer_name = inv.customer_name
  r.match_type = 'invoice_number'
  r.confidence = 50
  s.add(i)
  selected.value = s
}

function rowBg(r: any) {
  if (r.confidence >= 90) return 'bg-green-50/40'
  if (r.confidence >= 65) return 'bg-blue-50/30'
  if (r.confidence > 0) return 'bg-orange-50/30'
  return ''
}

function applyResults(data: any) {
  results.value = data.results
  openInvoices.value = data.open_invoices

  // Auto-select hochkonfidente Matches (aber keine bereits importierten)
  const s = new Set<number>()
  const assignments: Record<number, string> = {}
  data.results.forEach((r: any, i: number) => {
    if (r.confidence >= 65 && r.invoice_id && !r.already_imported) s.add(i)
    // Dropdown mit dem aktuellen (Auto-)Match vorbelegen, damit er bei
    // Bedarf direkt korrigiert werden kann.
    if (r.invoice_id) assignments[i] = r.invoice_id
  })
  selected.value = s
  manualAssignment.value = assignments
  step.value = 'results'
}

async function processXmlFile(content: string) {
  uploadError.value = null
  sourceType.value = 'camt'
  step.value = 'parsing'
  try {
    const data = await $fetch<any>('/api/invoices/camt-import', {
      method: 'POST',
      body: { xml_content: content },
    })
    applyResults(data)
  } catch (err: any) {
    uploadError.value = err?.data?.statusMessage || err?.message || 'Fehler beim Analysieren der Datei'
    step.value = 'upload'
  }
}

async function processCsvFile(content: string) {
  uploadError.value = null
  sourceType.value = 'csv'
  csvContent.value = content
  step.value = 'parsing'
  try {
    const data = await $fetch<any>('/api/invoices/csv-import-detect', {
      method: 'POST',
      body: { csv_content: content },
    })
    csvHeaders.value = data.headers
    csvPreviewRows.value = data.preview_rows
    const suggestion = data.suggested_mapping || {}
    csvUseSeparateCredit.value = !!suggestion.credit
    csvMapping.value = {
      date: suggestion.date || '',
      amount: suggestion.amount || '',
      credit: suggestion.credit || '',
      debit: suggestion.debit || '',
      reference: suggestion.reference || '',
      description: suggestion.description || '',
      debtor_name: suggestion.debtor_name || '',
      transaction_id: suggestion.transaction_id || '',
    }
    step.value = 'mapping'
  } catch (err: any) {
    uploadError.value = err?.data?.statusMessage || err?.message || 'Fehler beim Analysieren der CSV-Datei'
    step.value = 'upload'
  }
}

async function submitCsvImport() {
  if (!csvMappingValid.value) return
  uploadError.value = null
  step.value = 'parsing'
  try {
    const mapping: Record<string, string> = { date: csvMapping.value.date }
    if (csvUseSeparateCredit.value) {
      mapping.credit = csvMapping.value.credit
      if (csvMapping.value.debit) mapping.debit = csvMapping.value.debit
    } else {
      mapping.amount = csvMapping.value.amount
    }
    if (csvMapping.value.reference) mapping.reference = csvMapping.value.reference
    if (csvMapping.value.description) mapping.description = csvMapping.value.description
    if (csvMapping.value.debtor_name) mapping.debtor_name = csvMapping.value.debtor_name
    if (csvMapping.value.transaction_id) mapping.transaction_id = csvMapping.value.transaction_id

    const data = await $fetch<any>('/api/invoices/csv-import', {
      method: 'POST',
      body: { csv_content: csvContent.value, mapping },
    })
    applyResults(data)
  } catch (err: any) {
    uploadError.value = err?.data?.statusMessage || err?.message || 'Fehler beim Importieren der CSV-Datei'
    step.value = 'mapping'
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
  const isXml = /\.(xml|camt)$/i.test(file.name)
  const isCsv = /\.(csv|txt)$/i.test(file.name)
  if (!isXml && !isCsv) {
    uploadError.value = 'Bitte eine XML/CAMT- oder CSV-Datei auswählen'
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (isXml) processXmlFile(content)
    else processCsvFile(content)
  }
  reader.readAsText(file, 'UTF-8')
}

async function confirmPayments() {
  if (selected.value.size === 0) return
  isConfirming.value = true
  confirmError.value = null
  let count = 0

  for (const i of selected.value) {
    const r = results.value[i]
    if (!r.invoice_id || r.already_imported) continue
    try {
      await $fetch('/api/invoices/mark-invoice-paid', {
        method: 'POST',
        body: {
          invoice_id: r.invoice_id,
          paid_at: r.entry.date ? new Date(r.entry.date).toISOString() : undefined,
          paid_amount_rappen: r.entry.amount_rappen,
          note: `${sourceType.value === 'csv' ? 'CSV' : 'CAMT'}-Import: ${r.entry.reference_raw || r.entry.remittance_info || ''}`.trim(),
          camt_dedupe_key: r.entry.dedupe_key,
          camt_bank_ref: r.entry.bank_ref,
          camt_reference: r.entry.reference_raw || r.entry.remittance_info,
          camt_debtor_name: r.entry.debtor_name,
          import_source: sourceType.value,
        },
      })
      count++
    } catch (err: any) {
      if (err?.status === 409 || err?.response?.status === 409) {
        // Wurde zwischenzeitlich (z.B. in einem parallelen Import) bereits verbucht
        r.already_imported = true
        continue
      }
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
  csvContent.value = ''
  csvHeaders.value = []
  csvPreviewRows.value = []
  csvUseSeparateCredit.value = false
  csvMapping.value = { date: '', amount: '', credit: '', debit: '', reference: '', description: '', debtor_name: '', transaction_id: '' }
  if (fileInput.value) fileInput.value.value = ''
}

function close() {
  emit('update:modelValue', false)
  resetUpload()
}

watch(() => props.modelValue, (v) => { if (!v) resetUpload() })
</script>
