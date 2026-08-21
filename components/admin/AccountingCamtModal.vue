<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-full items-start justify-center p-4 pt-8">
      <div class="fixed inset-0 bg-black/50" @click="close"/>
      <div class="relative w-full max-w-5xl bg-white rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Kontoauszug importieren</h2>
            <p class="text-xs text-gray-500">CAMT.053/054 — Lastschriften mit offenen Ausgaben abgleichen</p>
          </div>
          <button type="button" @click="close" class="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <div class="p-6">
          <div v-if="step === 'upload'">
            <div
              class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400"
              @click="fileInput?.click()"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <p class="text-sm font-medium text-gray-700">CAMT-XML hierher ziehen oder klicken</p>
              <p class="text-xs text-gray-400 mt-1">E-Banking → Kontoauszug exportieren → XML / ISO 20022</p>
            </div>
            <input ref="fileInput" type="file" accept=".xml,.camt" class="hidden" @change="onFileSelect"/>
            <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
          </div>

          <div v-else-if="step === 'parsing'" class="py-12 text-center text-sm text-gray-500">Datei wird gelesen…</div>

          <div v-else-if="step === 'results'">
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="rounded-xl bg-emerald-50 p-3 text-center">
                <p class="text-xl font-bold text-emerald-700">{{ matchedCount }}</p>
                <p class="text-xs text-emerald-700">Zugeordnet</p>
              </div>
              <div class="rounded-xl bg-amber-50 p-3 text-center">
                <p class="text-xl font-bold text-amber-700">{{ createCount }}</p>
                <p class="text-xs text-amber-700">Neu anlegen</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3 text-center">
                <p class="text-xl font-bold text-gray-600">{{ alreadyCount }}</p>
                <p class="text-xs text-gray-500">Schon importiert</p>
              </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-xs text-gray-400 uppercase">
                  <tr>
                    <th class="px-3 py-2 text-left">Datum</th>
                    <th class="px-3 py-2 text-left">Empfänger</th>
                    <th class="px-3 py-2 text-right">Betrag</th>
                    <th class="px-3 py-2 text-left">Buchung</th>
                    <th class="px-3 py-2 text-left">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in results" :key="r.entry.dedupe_key" class="border-t border-gray-50" :class="r.already_imported ? 'opacity-50' : ''">
                    <td class="px-3 py-2 font-mono text-xs">{{ r.entry.date || '—' }}</td>
                    <td class="px-3 py-2">
                      <p class="text-xs font-medium text-gray-800">{{ r.entry.debtor_name || '—' }}</p>
                      <p class="text-xs text-gray-400 truncate max-w-[220px]">{{ r.entry.remittance_info || r.entry.reference_raw }}</p>
                    </td>
                    <td class="px-3 py-2 text-right font-semibold">{{ chf(r.entry.amount_rappen) }}</td>
                    <td class="px-3 py-2">
                      <select
                        v-if="!r.already_imported && actions[i] === 'match'"
                        :value="assignments[i] || ''"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1 w-56 bg-white"
                        @change="assignments[i] = ($event.target as HTMLSelectElement).value"
                      >
                        <option value="">— Ausgabe wählen —</option>
                        <option v-for="e in openExpenses" :key="e.id" :value="e.id">
                          {{ e.description }} ({{ chf(e.amount_rappen) }})
                        </option>
                      </select>
                      <p v-else-if="r.already_imported" class="text-xs text-gray-400">Bereits importiert</p>
                      <p v-else class="text-xs text-gray-400">Neue bezahlte Ausgabe</p>
                    </td>
                    <td class="px-3 py-2">
                      <select
                        v-if="!r.already_imported"
                        :value="actions[i]"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        @change="setAction(i, ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="match">Zuordnen</option>
                        <option value="create">Neu anlegen</option>
                        <option value="skip">Überspringen</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-5 flex justify-end gap-3">
              <button type="button" class="px-4 py-2 text-sm border border-gray-200 rounded-xl" @click="reset">Neue Datei</button>
              <button
                type="button"
                :disabled="applying || applyCount === 0"
                class="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 disabled:opacity-40"
                @click="apply"
              >
                {{ applying ? 'Buche…' : `${applyCount} verbuchen` }}
              </button>
            </div>
            <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
          </div>

          <div v-else-if="step === 'done'" class="py-10 text-center">
            <p class="text-lg font-semibold text-gray-900">Import abgeschlossen</p>
            <p class="text-sm text-gray-500 mt-1">{{ doneMatched }} zugeordnet, {{ doneCreated }} neu{{ doneErrors.length ? `, ${doneErrors.length} Hinweise` : '' }}</p>
            <p v-if="doneErrors.length" class="mt-3 text-xs text-amber-700 whitespace-pre-line">{{ doneErrors.slice(0, 6).join('\n') }}</p>
            <button type="button" class="mt-6 px-4 py-2 text-sm rounded-xl bg-gray-900 text-white" @click="close">Schliessen</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

type Result = {
  entry: {
    date: string
    amount_rappen: number
    debtor_name: string
    iban: string
    remittance_info: string
    reference_raw: string
    reference: string
    bank_ref: string | null
    dedupe_key: string
  }
  confidence: number
  match_type: string
  entry_id?: string
  already_imported?: boolean
}

const fileInput = ref<HTMLInputElement | null>(null)
const step = ref<'upload' | 'parsing' | 'results' | 'done'>('upload')
const error = ref('')
const results = ref<Result[]>([])
const openExpenses = ref<Array<{ id: string; description: string; amount_rappen: number }>>([])
const actions = ref<Array<'match' | 'create' | 'skip'>>([])
const assignments = ref<Record<number, string>>({})
const applying = ref(false)
const doneMatched = ref(0)
const doneCreated = ref(0)
const doneErrors = ref<string[]>([])

const matchedCount = computed(() => actions.value.filter((a, i) => a === 'match' && !results.value[i]?.already_imported).length)
const createCount = computed(() => actions.value.filter((a, i) => a === 'create' && !results.value[i]?.already_imported).length)
const alreadyCount = computed(() => results.value.filter(r => r.already_imported).length)
const applyCount = computed(() => actions.value.filter((a, i) => a !== 'skip' && !results.value[i]?.already_imported).length)

function chf(rappen: number) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format((rappen || 0) / 100)
}

function setAction(i: number, value: string) {
  actions.value[i] = value as 'match' | 'create' | 'skip'
}

function reset() {
  step.value = 'upload'
  error.value = ''
  results.value = []
  actions.value = []
  assignments.value = {}
  if (fileInput.value) fileInput.value.value = ''
}

function close() {
  emit('update:modelValue', false)
  reset()
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) readFile(file)
}

function readFile(file: File) {
  if (!/\.(xml|camt)$/i.test(file.name)) {
    error.value = 'Bitte eine CAMT-XML-Datei wählen'
    return
  }
  const reader = new FileReader()
  reader.onload = () => processXml(String(reader.result || ''))
  reader.readAsText(file, 'UTF-8')
}

async function processXml(xml: string) {
  error.value = ''
  step.value = 'parsing'
  try {
    const data = await $fetch<{
      results: Result[]
      open_expenses: Array<{ id: string; description: string; amount_rappen: number }>
    }>('/api/admin/accounting/import-camt', {
      method: 'POST',
      body: { xml_content: xml },
    })
    results.value = data.results
    openExpenses.value = data.open_expenses
    actions.value = data.results.map((r) => {
      if (r.already_imported) return 'skip'
      if (r.confidence >= 65 && r.entry_id) return 'match'
      return 'create'
    })
    assignments.value = Object.fromEntries(
      data.results.map((r, i) => [i, r.entry_id || '']),
    )
    step.value = 'results'
  } catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Datei konnte nicht gelesen werden'
    step.value = 'upload'
  }
}

async function apply() {
  applying.value = true
  error.value = ''
  try {
    const items = results.value.map((r, i) => ({
      action: r.already_imported ? 'skip' : actions.value[i],
      dedupe_key: r.entry.dedupe_key,
      entry_id: assignments.value[i] || r.entry_id,
      bank_ref: r.entry.bank_ref,
      date: r.entry.date,
      amount_rappen: r.entry.amount_rappen,
      reference: r.entry.reference || r.entry.reference_raw,
      counterparty_name: r.entry.debtor_name,
      remittance: r.entry.remittance_info,
      iban: r.entry.iban,
    })).filter(i => i.action !== 'skip')
    const res = await $fetch<{ matched: number; created: number; errors: string[] }>('/api/admin/accounting/import-camt-apply', {
      method: 'POST',
      body: { items },
    })
    doneMatched.value = res.matched
    doneCreated.value = res.created
    doneErrors.value = res.errors
    step.value = 'done'
    emit('done')
  } catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Import fehlgeschlagen'
  } finally {
    applying.value = false
  }
}

watch(() => props.modelValue, (v) => { if (!v) reset() })
</script>
