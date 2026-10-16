<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <NuxtLink to="/admin/companies" class="text-sm text-gray-500 hover:underline">Firmenkunden</NuxtLink>
      <h1 class="text-xl font-bold text-gray-900 mt-2">Historische Firmenrechnungen</h1>
      <p class="text-sm text-gray-500 mt-1 max-w-3xl">
        Rechnungen mit Firmenabrechnung ohne gespeicherte Firma. Ein Vorschlag aus der aktuellen Mitarbeiterfirma
        oder einem gleichen Namen ist kein Nachweis und wird nicht automatisch gespeichert.
      </p>
    </div>

    <div v-if="loadError" class="bg-white rounded-2xl border border-red-100 px-5 py-8 text-center">
      <p class="text-sm text-red-700">{{ loadError }}</p>
      <button type="button" class="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white" :style="{ background: primaryColor }" @click="loadInvoices">
        Erneut laden
      </button>
    </div>

    <div v-else-if="isLoading" class="bg-white rounded-2xl border border-gray-100 px-5 py-16 text-center text-gray-400">
      Lädt…
    </div>

    <div v-else-if="invoices.length === 0" class="bg-white rounded-2xl border border-gray-100 px-5 py-16 text-center text-gray-500">
      Keine historischen Firmenrechnungen ohne Firmenzuordnung.
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 text-sm text-gray-500">
          {{ totalLabel }}
          <span v-if="truncated"> Die ältesten {{ invoices.length }} werden angezeigt.</span>
          <span v-if="suggestionsIncomplete"> Namensvorschläge sind unvollständig.</span>
        </div>
        <div class="divide-y divide-gray-50">
          <button
            v-for="invoice in invoices"
            :key="invoice.id"
            type="button"
            class="w-full text-left px-5 py-4 hover:bg-gray-50"
            :class="selectedInvoice?.id === invoice.id ? 'bg-gray-50' : ''"
            @click="selectInvoice(invoice)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ invoice.invoice_number }}</p>
                <p class="text-sm text-gray-700 mt-1">{{ invoice.billing_company_name || 'Ohne Rechnungsempfänger' }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ invoice.invoice_date }} · {{ placeLabel(invoice) }}</p>
              </div>
              <span v-if="!invoice.link_allowed" class="text-xs font-medium text-amber-700">Gesperrt</span>
            </div>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 space-y-4">
        <div v-if="!selectedInvoice" class="text-sm text-gray-500">Rechnung auswählen, dann die Firma suchen und bestätigen.</div>
        <template v-else>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-400">Rechnung</p>
            <p class="text-sm font-semibold text-gray-900 mt-1">{{ selectedInvoice.invoice_number }}</p>
            <p class="text-sm text-gray-700">{{ selectedInvoice.billing_company_name || 'Ohne Rechnungsempfänger' }}</p>
            <p class="text-xs text-gray-400 mt-1">Erstellt {{ selectedInvoice.created_at }} · {{ placeLabel(selectedInvoice) }}</p>
          </div>

          <p v-if="selectedInvoice.link_block_reason" class="text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
            {{ selectedInvoice.link_block_reason }}
          </p>

          <div v-if="selectedInvoice.suggestions.length" class="space-y-2">
            <p class="text-xs uppercase tracking-wide text-gray-400">Vorschläge, kein Nachweis</p>
            <button
              v-for="suggestion in selectedInvoice.suggestions"
              :key="suggestion.company_id + suggestion.sources.join()"
              type="button"
              class="w-full text-left border border-gray-200 rounded-xl px-3 py-2 text-sm"
              :disabled="!selectedInvoice.link_allowed"
              @click="chooseSuggestion(suggestion)"
            >
              <span class="font-medium text-gray-900">{{ suggestion.company_name }}</span>
              <span class="block text-xs text-gray-500 mt-1">{{ suggestionLabel(suggestion) }}</span>
            </button>
          </div>

          <div>
            <label class="text-xs uppercase tracking-wide text-gray-400" for="company-search">Firma suchen</label>
            <input
              id="company-search"
              v-model="companySearch"
              type="text"
              class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              placeholder="Firmenname"
              :disabled="!selectedInvoice.link_allowed"
              @input="searchCompanies"
            >
            <div v-if="companyResults.length" class="mt-2 border border-gray-100 rounded-xl divide-y">
              <button
                v-for="company in companyResults"
                :key="company.id"
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                @click="chooseCompany(company)"
              >
                {{ company.name }}<span v-if="company.city" class="text-gray-400"> · {{ company.city }}</span>
              </button>
            </div>
          </div>

          <div v-if="chosenCompany" class="rounded-xl bg-gray-50 px-3 py-3 text-sm">
            <p class="text-gray-500">Ausgewählte Firma</p>
            <p class="font-semibold text-gray-900">{{ chosenCompany.name }}</p>
          </div>

          <label class="flex items-start gap-2 text-sm text-gray-700">
            <input v-model="confirmed" type="checkbox" class="mt-1" :disabled="!canPrepareSave">
            <span>Ich bestätige diese Zuordnung. Vorschläge ersetzen die Prüfung nicht.</span>
          </label>

          <p v-if="saveError" class="text-sm text-red-700">{{ saveError }}</p>

          <button
            type="button"
            class="w-full px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            :style="{ background: primaryColor }"
            :disabled="!canSave || isSaving"
            @click="saveLink"
          >
            {{ isSaving ? 'Speichert…' : 'Zuordnung speichern' }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

type Suggestion = {
  company_id: string
  company_name: string
  company_created_at: string | null
  invoice_predates_company: boolean
  sources: Array<'current_membership' | 'exact_billing_name'>
  authoritative: false
}

type UnlinkedInvoice = {
  id: string
  invoice_number: string
  invoice_date: string
  created_at: string
  updated_at: string
  billing_company_name: string | null
  billing_city: string | null
  billing_zip: string | null
  link_allowed: boolean
  link_block_reason: string | null
  suggestions: Suggestion[]
}

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Historische Firmenrechnungen' })

const { currentTenantBranding } = useTenantBranding()
const primaryColor = computed(() => currentTenantBranding.value?.colors?.primary || '#2563eb')

const invoices = ref<UnlinkedInvoice[]>([])
const total = ref<number | null>(null)
const truncated = ref(false)
const suggestionsIncomplete = ref(false)
const isLoading = ref(true)
const loadError = ref('')
const selectedInvoice = ref<UnlinkedInvoice | null>(null)
const companySearch = ref('')
const companyResults = ref<Array<{ id: string; name: string; city: string | null }>>([])
const chosenCompany = ref<{ id: string; name: string } | null>(null)
const confirmed = ref(false)
const isSaving = ref(false)
const saveError = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalLabel = computed(() => {
  if (total.value == null) return `${invoices.value.length} Rechnungen geladen`
  return `${total.value} nicht zugeordnete Firmenrechnungen`
})
const canPrepareSave = computed(() => !!selectedInvoice.value?.link_allowed && !!chosenCompany.value)
const canSave = computed(() => canPrepareSave.value && confirmed.value)

function placeLabel(invoice: UnlinkedInvoice) {
  return [invoice.billing_zip, invoice.billing_city].filter(Boolean).join(' ') || 'Ohne Ort'
}

function suggestionLabel(suggestion: Suggestion) {
  const sources = suggestion.sources.map((source) =>
    source === 'current_membership' ? 'aktuelle Mitarbeiterfirma' : 'gleicher Name',
  )
  const timing = suggestion.invoice_predates_company ? ' Rechnung liegt vor der Firma.' : ''
  return `${sources.join(' und ')}. Kein Nachweis.${timing}`
}

function selectInvoice(invoice: UnlinkedInvoice) {
  selectedInvoice.value = invoice
  chosenCompany.value = null
  confirmed.value = false
  saveError.value = ''
  companySearch.value = ''
  companyResults.value = []
}

function chooseCompany(company: { id: string; name: string }) {
  chosenCompany.value = { id: company.id, name: company.name }
  confirmed.value = false
  companyResults.value = []
}

function chooseSuggestion(suggestion: Suggestion) {
  if (!selectedInvoice.value?.link_allowed) return
  chooseCompany({ id: suggestion.company_id, name: suggestion.company_name })
}

function searchCompanies() {
  if (searchTimer) clearTimeout(searchTimer)
  const query = companySearch.value.trim()
  if (query.length < 2) {
    companyResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const response = await $fetch<{ companies?: Array<{ id: string; name: string; city?: string | null }> }>('/api/admin/companies', {
        query: { search: query },
      })
      companyResults.value = (response.companies || []).map((company) => ({
        id: company.id,
        name: company.name,
        city: company.city || null,
      }))
    } catch {
      companyResults.value = []
    }
  }, 280)
}

async function loadInvoices() {
  isLoading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<{
      invoices: UnlinkedInvoice[]
      total: number | null
      truncated: boolean
      suggestions_incomplete: boolean
    }>('/api/admin/invoices/unlinked-company')
    invoices.value = response.invoices || []
    total.value = response.total
    truncated.value = response.truncated
    suggestionsIncomplete.value = response.suggestions_incomplete
    if (selectedInvoice.value) {
      selectedInvoice.value = invoices.value.find((invoice) => invoice.id === selectedInvoice.value?.id) || null
    }
  } catch {
    invoices.value = []
    loadError.value = 'Rechnungen konnten nicht geladen werden.'
  } finally {
    isLoading.value = false
  }
}

async function saveLink() {
  if (!selectedInvoice.value || !chosenCompany.value || !confirmed.value) return
  isSaving.value = true
  saveError.value = ''
  try {
    await $fetch('/api/admin/invoices/link-company', {
      method: 'POST',
      body: {
        invoice_id: selectedInvoice.value.id,
        company_id: chosenCompany.value.id,
        expected_updated_at: selectedInvoice.value.updated_at,
        confirm: true,
      },
    })
    chosenCompany.value = null
    confirmed.value = false
    selectedInvoice.value = null
    await loadInvoices()
  } catch (error: any) {
    saveError.value = error?.data?.statusMessage || error?.data?.message || error?.statusMessage || 'Zuordnung wurde nicht gespeichert.'
    await loadInvoices()
  } finally {
    isSaving.value = false
  }
}

onMounted(loadInvoices)
</script>
