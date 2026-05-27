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
            <h1 class="text-2xl font-bold text-gray-900">Leads importieren</h1>
            <p class="text-sm text-gray-500">CSV-Datei hochladen und Kontakte in die Datenbank importieren</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- GDPR Info -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
        <svg class="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm text-yellow-800">
          <strong>DSGVO-Hinweis:</strong> Importierte Leads erhalten automatisch den Status "Consent ausstehend" und werden <strong>nicht</strong> angeschrieben, bis sie über eine Re-Consent-Kampagne ihr Opt-In bestätigen.
        </p>
      </div>

      <!-- Step 1: Upload -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="text-base font-semibold text-gray-900 mb-4">1. CSV-Datei hochladen</h2>

        <div
          class="border-2 border-dashed rounded-xl transition-colors cursor-pointer"
          :class="fileMeta.name ? 'border-green-400 bg-green-50' : !isDragging ? 'border-gray-300 hover:border-gray-400' : ''"
          :style="isDragging && !fileMeta.name ? { borderColor: primaryColor, background: `${primaryColor}10` } : {}"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
          @click="fileInputRef?.click()"
        >
          <input ref="fileInputRef" type="file" accept=".csv,text/csv" class="hidden" @change="handleFile" />
          <div class="px-6 py-10 text-center">
            <div class="mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center" :class="fileMeta.name ? 'bg-green-100' : 'bg-gray-100'">
              <svg class="w-5 h-5" :class="fileMeta.name ? 'text-green-600' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p class="font-medium text-gray-900">{{ fileMeta.name || 'CSV hierher ziehen oder klicken' }}</p>
            <p class="text-sm text-gray-500 mt-1">
              {{ fileMeta.name ? `${rows.length.toLocaleString('de-CH')} Zeilen · ${columns.length} Spalten erkannt` : 'Unterstützt Komma (,), Semikolon (;) und Tab' }}
            </p>
          </div>
        </div>

        <div v-if="fileMeta.name" class="mt-3 flex justify-end">
          <button @click="reset" class="text-sm text-gray-500 hover:text-gray-700">Datei entfernen</button>
        </div>
      </div>

      <!-- Step 2: Column Mapping -->
      <div v-if="columns.length" class="bg-white rounded-xl border p-6 space-y-4">
        <h2 class="text-base font-semibold text-gray-900">2. Spalten zuordnen</h2>
        <p class="text-sm text-gray-500">Weise die Spalten aus deiner CSV den richtigen Feldern zu. Nur "Email" ist Pflicht.</p>

        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="field in FIELD_MAP" :key="field.key">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              {{ field.label }}
              <span v-if="field.required" class="text-red-500">*</span>
            </label>
            <select
              v-model="mapping[field.key]"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
            >
              <option value="">(nicht importieren)</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="mapping.email" class="mt-4">
          <p class="text-xs font-medium text-gray-500 uppercase mb-2">Vorschau (erste 5 Zeilen)</p>
          <div class="overflow-x-auto border rounded-lg">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  <th v-for="field in FIELD_MAP.filter(f => mapping[f.key])" :key="field.key" class="px-3 py-2 text-left font-medium text-gray-500">
                    {{ field.label }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(row, i) in rows.slice(0, 5)" :key="i">
                  <td v-for="field in FIELD_MAP.filter(f => mapping[f.key])" :key="field.key" class="px-3 py-2 text-gray-700">
                    {{ row[mapping[field.key]] || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Step 3: Settings -->
      <div v-if="columns.length" class="bg-white rounded-xl border p-6 space-y-4">
        <h2 class="text-base font-semibold text-gray-900">3. Import-Einstellungen</h2>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Import-Bezeichnung <span class="text-red-500">*</span></label>
            <input
              v-model="sourceLabel"
              type="text"
              placeholder="z.B. Alte Kundenliste Auto 2023"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Kategorien für alle importierten Leads</label>
          <div class="flex flex-wrap gap-3">
            <label v-for="cat in CATEGORIES" :key="cat.value" class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :value="cat.value" v-model="defaultCategories" class="rounded" />
              <span class="text-sm text-gray-700">{{ cat.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Import Button -->
      <div v-if="columns.length && mapping.email && sourceLabel" class="bg-white rounded-xl border p-6">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-gray-900">Bereit zum Import</div>
            <div class="text-sm text-gray-500 mt-1">{{ rows.length.toLocaleString('de-CH') }} Zeilen werden verarbeitet</div>
          </div>
          <button
            @click="startImport"
            :disabled="importing"
            class="px-6 py-3 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
            :style="{ background: primaryColor }"
          >
            <svg v-if="importing" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ importing ? 'Importiere...' : 'Import starten' }}
          </button>
        </div>
      </div>

      <!-- Result -->
      <div v-if="importResult" class="bg-white rounded-xl border p-6 space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-gray-900">Import abgeschlossen</div>
            <div class="text-sm text-gray-500">
              {{ importResult.importedCount }} importiert · {{ importResult.skippedCount }} Duplikate übersprungen · {{ importResult.errorCount }} Fehler
            </div>
          </div>
        </div>

        <!-- Errors -->
        <div v-if="importResult.errors?.length" class="bg-red-50 rounded-lg p-3">
          <p class="text-sm font-medium text-red-800 mb-2">Fehlerhafte Zeilen ({{ importResult.errorCount }}):</p>
          <div v-for="err in importResult.errors.slice(0, 10)" :key="err.row" class="text-xs text-red-700">
            Zeile {{ err.row }}: {{ err.email || '(leer)' }} — {{ err.reason }}
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <NuxtLink to="/admin/marketing/leads"
            class="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
            :style="{ background: primaryColor }">
            Leads anzeigen
          </NuxtLink>
          <button @click="reset" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Weiteren Import starten
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Leads importieren - Admin' })

const { primaryColor } = useTenantBranding()
const authStore = useAuthStore()

const tenantId = computed(() => authStore.userProfile?.tenant_id)
const { data: categoriesData } = await useFetch('/api/marketing/lead-categories', {
  query: { tenantId },
})
const CATEGORIES = computed(() =>
  (categoriesData.value?.categories ?? []).map((c: any) => ({ value: c.code, label: c.name }))
)

const FIELD_MAP = [
  { key: 'email', label: 'E-Mail-Adresse', required: true },
  { key: 'first_name', label: 'Vorname', required: false },
  { key: 'last_name', label: 'Nachname', required: false },
  { key: 'phone', label: 'Telefon', required: false },
]

type Row = Record<string, string>

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const fileMeta = reactive({ name: '', size: 0 })
const columns = ref<string[]>([])
const rows = ref<Row[]>([])
const mapping = reactive<Record<string, string>>({ email: '', first_name: '', last_name: '', phone: '' })
const sourceLabel = ref('')
const defaultCategories = ref<string[]>([])
const importing = ref(false)
const importResult = ref<any>(null)

function detectDelimiter(sample: string) {
  const counts = { ',': 0, ';': 0, '\t': 0 }
  for (const d of [',', ';', '\t'] as const) counts[d] = sample.split(d).length - 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ
    } else if (ch === delimiter && !inQ) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (!lines.length) return
  const delimiter = detectDelimiter(lines[0])
  const header = parseLine(lines[0], delimiter)
  columns.value = header
  rows.value = lines.slice(1).map(line => {
    const fields = parseLine(line, delimiter)
    const row: Row = {}
    header.forEach((h, i) => { row[h] = fields[i] ?? '' })
    return row
  })

  // Auto-detect common column names
  const lc = header.map(h => h.toLowerCase())
  FIELD_MAP.forEach(f => {
    const candidates: Record<string, string[]> = {
      email: ['email', 'e-mail', 'mail'],
      first_name: ['vorname', 'first_name', 'firstname', 'vname'],
      last_name: ['nachname', 'last_name', 'lastname', 'name'],
      phone: ['telefon', 'phone', 'tel', 'mobil', 'mobile'],
    }
    const match = candidates[f.key]?.find(c => lc.includes(c))
    if (match) mapping[f.key] = header[lc.indexOf(match)]
  })
}

async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileMeta.name = file.name
  fileMeta.size = file.size
  parseCsv(await file.text())
}

async function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  fileMeta.name = file.name
  fileMeta.size = file.size
  parseCsv(await file.text())
}

function reset() {
  fileMeta.name = ''
  fileMeta.size = 0
  columns.value = []
  rows.value = []
  Object.keys(mapping).forEach(k => (mapping[k] = ''))
  sourceLabel.value = ''
  defaultCategories.value = []
  importResult.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function startImport() {
  const userId = authStore.userProfile?.id
  if (!tenantId.value || !rows.value.length || !mapping.email) return

  importing.value = true
  importResult.value = null

  try {
    const leads = rows.value.map(row => ({
      email: row[mapping.email] || '',
      first_name: mapping.first_name ? row[mapping.first_name] || '' : '',
      last_name: mapping.last_name ? row[mapping.last_name] || '' : '',
      phone: mapping.phone ? row[mapping.phone] || '' : '',
    }))

    const res = await $fetch('/api/marketing/import-leads', {
      method: 'POST',
      body: {
        tenantId: tenantId.value,
        createdBy: userId,
        leads,
        sourceLabel: sourceLabel.value,
        defaultCategories: defaultCategories.value,
      },
    })
    importResult.value = res
  } catch (err: any) {
    alert(`Import fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`)
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
</style>
