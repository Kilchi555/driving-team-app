<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
        <NuxtLink to="/dashboard" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </NuxtLink>
        <h1 class="text-base font-semibold text-gray-900 flex-1">Beleg einreichen</h1>
      </div>
    </div>

    <div class="max-w-lg mx-auto px-4 py-4 space-y-4">

      <!-- Submit form -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">

        <!-- Receipt upload -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">Beleg / Quittung <span class="text-red-500">*</span></label>

          <div v-if="form.receipt_url" class="flex items-center gap-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <svg class="w-7 h-7 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-emerald-700 truncate">{{ form.receipt_filename || 'Beleg hochgeladen' }}</p>
              <a :href="form.receipt_url" target="_blank" class="text-xs text-emerald-600 underline">Anzeigen</a>
            </div>
            <button @click="form.receipt_url = ''; form.receipt_filename = ''" class="text-gray-400 hover:text-red-500 transition-colors p-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <!-- Hidden input, triggered by button below — avoids iOS PWA navigation issue with label wrapping -->
          <input ref="fileInput" type="file" class="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp"
            :disabled="uploading" @change="uploadReceipt"/>

          <button v-if="!form.receipt_url" type="button" @click="fileInput?.click()"
            :disabled="uploading || parsing"
            class="w-full flex items-center gap-3 p-3 border border-dashed rounded-xl transition-colors"
            :class="uploading ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 active:bg-gray-50'">
            <svg v-if="!uploading" class="w-8 h-8 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <svg v-else class="w-7 h-7 text-emerald-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <div class="text-left">
              <p class="text-sm text-gray-600 font-medium">{{ uploading ? 'Wird hochgeladen…' : 'Foto oder PDF' }}</p>
              <p class="text-xs text-gray-400">JPG, PNG, PDF</p>
            </div>
          </button>
          <p v-if="uploadError" class="text-xs text-red-500 mt-1">{{ uploadError }}</p>
        </div>

        <!-- OCR status -->
        <div v-if="parsing" class="flex items-center gap-2 py-1">
          <svg class="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span class="text-xs text-gray-500">Beleg wird analysiert…</span>
        </div>
        <div v-else-if="parseHint" class="flex items-center gap-2 py-0.5">
          <svg class="w-3.5 h-3.5 flex-shrink-0" :class="parseHint.includes('erkannt') && !parseHint.includes('prüfen') ? 'text-emerald-500' : 'text-amber-500'" fill="currentColor" viewBox="0 0 20 20">
            <path v-if="parseHint.includes('erkannt') && !parseHint.includes('prüfen')" fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            <path v-else fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span class="text-xs" :class="parseHint.includes('erkannt') && !parseHint.includes('prüfen') ? 'text-emerald-600' : 'text-amber-600'">{{ parseHint }}</span>
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Betrag <span class="text-red-500">*</span></label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">CHF</span>
            <input v-model="form.amount_chf" type="number" step="0.05" min="0.05" placeholder="0.00"
              class="w-full pl-14 pr-4 py-2.5 border border-gray-200 rounded-xl text-[16px] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-semibold"/>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Beschreibung <span class="text-red-500">*</span></label>
          <input v-model="form.description" type="text" placeholder="z.B. Parkgebühr Kundentermin, Druckerpapier…"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
        </div>

        <!-- Date -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Datum</label>
          <input v-model="form.entry_date" type="date"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
        </div>

        <!-- Notes (optional) -->
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Bemerkung <span class="text-gray-400">(optional)</span></label>
          <textarea v-model="form.notes" rows="2" placeholder="Weitere Infos für die Administration…"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"/>
        </div>

        <p v-if="submitError" class="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{{ submitError }}</p>

        <button @click="submit" :disabled="submitting || uploading || parsing"
          class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm">
          {{ submitting ? 'Wird eingereicht…' : 'Beleg einreichen' }}
        </button>
      </div>

      <!-- Success toast -->
      <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showSuccess" class="bg-emerald-600 text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg">
          <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm font-medium">Beleg eingereicht — die Administration wird benachrichtigt.</p>
        </div>
      </Transition>

      <!-- My submissions -->
      <div v-if="myExpenses.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span class="text-sm font-semibold text-gray-700">Meine Einreichungen</span>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="exp in myExpenses" :key="exp.id" class="px-4 py-3 flex items-start gap-3">

            <!-- Status icon -->
            <div class="mt-0.5 flex-shrink-0">
              <span v-if="exp.approval_status === 'approved'" class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              </span>
              <span v-else-if="exp.approval_status === 'pending'" class="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
              </span>
              <span v-else class="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ exp.description }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-500">{{ fmtDate(exp.entry_date) }}</span>
                <span class="text-xs font-semibold" :class="exp.approval_status === 'approved' ? 'text-emerald-600' : exp.approval_status === 'pending' ? 'text-amber-600' : 'text-red-500'">
                  {{ exp.approval_status === 'approved' ? 'Genehmigt' : exp.approval_status === 'pending' ? 'Ausstehend' : 'Abgelehnt' }}
                </span>
              </div>
              <p v-if="exp.rejection_reason" class="text-xs text-red-500 mt-0.5">{{ exp.rejection_reason }}</p>
            </div>

            <div class="flex-shrink-0 text-right">
              <p class="text-sm font-bold text-gray-900">{{ chf(exp.amount_rappen) }}</p>
              <a v-if="exp.receipt_url" :href="exp.receipt_url" target="_blank" class="text-xs text-blue-500 underline">Beleg</a>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

interface ExpenseEntry {
  id: string
  amount_rappen: number
  description: string
  entry_date: string
  receipt_url: string | null
  receipt_filename: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
}

// ─── Form ─────────────────────────────────────────────────────────────────────
const form = ref({
  amount_chf: '' as number | '',
  description: '',
  entry_date: new Date().toISOString().split('T')[0],
  notes: '',
  receipt_url: '',
  receipt_filename: '',
})

const fileInput    = ref<HTMLInputElement | null>(null)
const uploading    = ref(false)
const uploadError  = ref('')
const parsing      = ref(false)
const parseHint    = ref('')
const submitting   = ref(false)
const submitError  = ref('')
const showSuccess  = ref(false)
const myExpenses   = ref<ExpenseEntry[]>([])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function chf(rappen: number) {
  return `CHF ${(rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Upload receipt ────────────────────────────────────────────────────────────
async function uploadReceipt(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  parseHint.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ success: boolean; url: string; filename: string }>(
      '/api/staff/upload-expense-receipt', { method: 'POST', body: fd }
    )
    form.value.receipt_url      = res.url ?? ''
    form.value.receipt_filename = res.filename ?? file.name

    // Auto-parse receipt with GPT-4o Vision
    if (form.value.receipt_url) {
      uploading.value = false
      parsing.value = true
      try {
        const ocr = await $fetch<{ success: boolean; data: { amount_chf: number | null; date: string | null; merchant: string | null; confidence: string } }>(
          '/api/staff/parse-receipt', { method: 'POST', body: { receipt_url: form.value.receipt_url } }
        )
        const d = ocr.data
        if (d.amount_chf && !form.value.amount_chf) {
          form.value.amount_chf = d.amount_chf
        }
        if (d.date && form.value.entry_date === new Date().toISOString().split('T')[0]) {
          form.value.entry_date = d.date
        }
        if (d.merchant && !form.value.description) {
          form.value.description = d.merchant
        }
        const filled = [d.amount_chf, d.date, d.merchant].filter(Boolean).length
        parseHint.value = filled > 0
          ? `Automatisch erkannt${d.confidence === 'low' ? ' (bitte prüfen)' : ''}`
          : 'Keine Daten erkannt — bitte manuell ausfüllen'
      } catch {
        parseHint.value = 'Automatische Erkennung nicht verfügbar'
      } finally {
        parsing.value = false
      }
    }
  } catch (err: any) {
    uploadError.value = err.data?.statusMessage ?? 'Upload fehlgeschlagen'
    uploading.value = false
  } finally {
    uploading.value = false
  }
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function submit() {
  submitError.value = ''
  if (!form.value.receipt_url) { submitError.value = 'Bitte zuerst Beleg hochladen'; return }
  if (!Number(form.value.amount_chf) || Number(form.value.amount_chf) <= 0) { submitError.value = 'Betrag erforderlich'; return }
  if (!form.value.description.trim()) { submitError.value = 'Beschreibung erforderlich'; return }

  submitting.value = true
  try {
    await $fetch('/api/staff/submit-expense', { method: 'POST', body: form.value })
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 4000)
    form.value = {
      amount_chf: '', description: '',
      entry_date: new Date().toISOString().split('T')[0],
      notes: '', receipt_url: '', receipt_filename: '',
    }
    parseHint.value = ''
    await loadMyExpenses()
  } catch (err: any) {
    submitError.value = err.data?.statusMessage ?? 'Fehler beim Einreichen'
  } finally {
    submitting.value = false
  }
}

// ─── Load history ─────────────────────────────────────────────────────────────
async function loadMyExpenses() {
  try {
    const res = await $fetch<{ success: boolean; data: ExpenseEntry[] }>('/api/staff/my-expenses')
    myExpenses.value = res.data ?? []
  } catch {}
}

onMounted(loadMyExpenses)
</script>
