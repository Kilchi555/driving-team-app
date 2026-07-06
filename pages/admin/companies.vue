<template>
  <div class="p-4 max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Firmenkunden</h1>
        <p class="text-sm text-gray-500 mt-1">Firmen verwalten, Mitarbeiter zuordnen und Rechnungen erstellen.</p>
      </div>
      <button @click="openCreate" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl"
        :style="{ background: primaryColor }">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Neue Firma
      </button>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
      <input v-model="search" type="text" placeholder="Firma suchen…"
        class="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-16 text-gray-400">Lädt…</div>

    <!-- Empty -->
    <div v-else-if="filteredCompanies.length === 0" class="text-center py-16 text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
      <p class="font-medium">Keine Firmen vorhanden</p>
      <p class="text-xs mt-1">Erstelle eine neue Firma um zu starten.</p>
    </div>

    <!-- Company cards -->
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="company in filteredCompanies" :key="company.id"
        class="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
        @click="openDetail(company)">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-gray-900 truncate">{{ company.name }}</h3>
            <p v-if="company.contact_person" class="text-sm text-gray-500">{{ company.contact_person }}</p>
          </div>
          <span class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            :style="{ background: primaryColor }">
            {{ company.name.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="mt-3 space-y-1 text-xs text-gray-500">
          <div v-if="company.email" class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            {{ company.email }}
          </div>
          <div v-if="company.city" class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
            {{ [company.zip, company.city].filter(Boolean).join(' ') }}
          </div>
          <div v-if="company.vat_number" class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            UID: {{ company.vat_number }}
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ (company.users || []).length }} Mitarbeiter</span>
          <span class="text-xs text-blue-600 font-medium hover:underline">Details →</span>
        </div>
      </div>
    </div>

    <!-- Company Detail / Edit Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        @click.self="closeModal">
        <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[95dvh] overflow-y-auto">
          <div class="flex items-center justify-between p-5 pb-3 sticky top-0 bg-white border-b border-gray-100">
            <h3 class="text-base font-bold text-gray-900">
              {{ editingCompany?.id ? editingCompany.name : 'Neue Firma' }}
            </h3>
            <button @click="closeModal" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tabs when editing existing company -->
          <div v-if="editingCompany?.id" class="flex gap-1 px-5 pt-4">
            <button v-for="tab in ['Details', 'Mitarbeiter', 'Rechnungen']" :key="tab"
              @click="detailTab = tab"
              class="px-3 py-1.5 text-sm rounded-lg transition-colors"
              :class="detailTab === tab ? 'text-white' : 'text-gray-500 hover:bg-gray-100'"
              :style="detailTab === tab ? { background: primaryColor } : {}">
              {{ tab }}
            </button>
          </div>

          <!-- Details Tab -->
          <form v-if="!editingCompany?.id || detailTab === 'Details'" @submit.prevent="saveCompany" class="p-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Firmenname *</label>
                <input v-model="form.name" type="text" required placeholder="Muster AG"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Ansprechperson</label>
                <input v-model="form.contact_person" type="text" placeholder="Max Muster"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
                <input v-model="form.email" type="email" placeholder="info@firma.ch"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                <input v-model="form.phone" type="tel"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">UID (MwSt-Nummer)</label>
                <input v-model="form.vat_number" type="text" placeholder="CHE-123.456.789 MWST"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Handelsregisternummer</label>
                <input v-model="form.company_register_number" type="text"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Strasse</label>
                <input v-model="form.street" type="text"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="col-span-1">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nr.</label>
                  <input v-model="form.street_nr" type="text"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">PLZ</label>
                  <input v-model="form.zip" type="text"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Ort</label>
                  <input v-model="form.city" type="text"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Notizen</label>
                <textarea v-model="form.notes" rows="2" class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
            </div>

            <p v-if="formError" class="text-sm text-red-700 bg-red-50 rounded-xl p-3">{{ formError }}</p>

            <div class="flex items-center justify-between gap-2 pt-1">
              <button v-if="editingCompany?.id" type="button" @click="archiveCompany"
                class="text-sm text-red-500 hover:text-red-700">Archivieren</button>
              <div class="flex gap-2 ml-auto">
                <button type="button" @click="closeModal" class="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Abbrechen</button>
                <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50"
                  :style="{ background: primaryColor }">
                  {{ isSaving ? 'Speichern…' : 'Speichern' }}
                </button>
              </div>
            </div>
          </form>

          <!-- Mitarbeiter Tab -->
          <div v-else-if="detailTab === 'Mitarbeiter'" class="p-5 space-y-4">
            <div class="flex items-center gap-2">
              <input v-model="userSearchQuery" type="text" placeholder="Kunden suchen und hinzufügen…"
                @input="searchUsers"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <!-- Search results -->
            <div v-if="userSearchResults.length > 0" class="border border-gray-200 rounded-xl overflow-hidden">
              <button v-for="u in userSearchResults" :key="u.id"
                @click="assignUser(u)"
                class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  :style="{ background: primaryColor }">
                  {{ (u.first_name || '?').charAt(0) }}
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ u.first_name }} {{ u.last_name }}</p>
                  <p class="text-xs text-gray-500">{{ u.email }}</p>
                </div>
                <span class="ml-auto text-xs text-blue-600">Hinzufügen</span>
              </button>
            </div>

            <!-- Current members -->
            <div v-if="companyUsers.length === 0" class="text-center py-8 text-gray-400 text-sm">
              Noch keine Mitarbeiter zugeordnet.
            </div>
            <div v-else class="space-y-2">
              <div v-for="u in companyUsers" :key="u.id"
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  :style="{ background: primaryColor }">
                  {{ (u.first_name || '?').charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">{{ u.first_name }} {{ u.last_name }}</p>
                  <p class="text-xs text-gray-500">{{ u.email }}</p>
                </div>
                <button @click="removeUser(u)" class="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Rechnungen Tab -->
          <div v-else-if="detailTab === 'Rechnungen'" class="p-5 space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-gray-500">Rechnungen für <strong>{{ editingCompany?.name }}</strong></p>
              <button @click="createInvoiceForCompany"
                class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                :style="{ background: primaryColor }">
                + Rechnung erstellen
              </button>
            </div>
            <div v-if="companyInvoices.length === 0" class="text-center py-8 text-gray-400 text-sm">
              Noch keine Rechnungen.
            </div>
            <div v-else class="space-y-2">
              <div v-for="inv in companyInvoices" :key="inv.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ inv.invoice_number }}</p>
                  <p class="text-xs text-gray-500">{{ inv.invoice_date }} · CHF {{ (inv.total_amount_rappen / 100).toFixed(2) }}</p>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="{
                    'bg-green-100 text-green-700': inv.payment_status === 'paid',
                    'bg-yellow-100 text-yellow-700': inv.payment_status === 'pending',
                    'bg-red-100 text-red-700': inv.payment_status === 'overdue',
                    'bg-gray-100 text-gray-600': inv.status === 'draft',
                  }">
                  {{ inv.status === 'draft' ? 'Entwurf' : inv.payment_status === 'paid' ? 'Bezahlt' : inv.payment_status === 'overdue' ? 'Überfällig' : 'Offen' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Firmenkunden' })

const { currentTenantBranding } = useTenantBranding()
const primaryColor = computed(() => currentTenantBranding.value?.colors?.primary || '#2563eb')

const companies = ref<any[]>([])
const isLoading = ref(false)
const search = ref('')

const filteredCompanies = computed(() =>
  search.value
    ? companies.value.filter(c => c.name.toLowerCase().includes(search.value.toLowerCase()))
    : companies.value
)

async function load() {
  isLoading.value = true
  try {
    const res: any = await $fetch('/api/admin/companies')
    companies.value = res.companies || []
  } finally {
    isLoading.value = false
  }
}

// ── Modal state ─────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const editingCompany = ref<any>(null)
const detailTab = ref('Details')
const isSaving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  name: '', contact_person: '', email: '', phone: '',
  vat_number: '', company_register_number: '',
  street: '', street_nr: '', zip: '', city: '',
  notes: '',
})
const form = ref(emptyForm())

function openCreate() {
  editingCompany.value = null
  form.value = emptyForm()
  detailTab.value = 'Details'
  formError.value = ''
  modalOpen.value = true
}

function openDetail(company: any) {
  editingCompany.value = company
  form.value = {
    name: company.name || '',
    contact_person: company.contact_person || '',
    email: company.email || '',
    phone: company.phone || '',
    vat_number: company.vat_number || '',
    company_register_number: company.company_register_number || '',
    street: company.street || '',
    street_nr: company.street_nr || '',
    zip: company.zip || '',
    city: company.city || '',
    notes: company.notes || '',
  }
  detailTab.value = 'Details'
  formError.value = ''
  modalOpen.value = true
  loadCompanyUsers()
  loadCompanyInvoices()
}

function closeModal() { modalOpen.value = false }

async function saveCompany() {
  formError.value = ''
  isSaving.value = true
  try {
    const action = editingCompany.value?.id ? 'update' : 'create'
    await $fetch('/api/admin/companies', {
      method: 'POST',
      body: { action, id: editingCompany.value?.id, ...form.value },
    })
    await load()
    closeModal()
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || 'Fehler beim Speichern.'
  } finally {
    isSaving.value = false
  }
}

async function archiveCompany() {
  if (!editingCompany.value?.id) return
  if (!confirm('Firma archivieren?')) return
  await $fetch('/api/admin/companies', { method: 'POST', body: { action: 'delete', id: editingCompany.value.id } })
  await load()
  closeModal()
}

// ── Mitarbeiter ──────────────────────────────────────────────────────────────
const companyUsers = ref<any[]>([])
const userSearchQuery = ref('')
const userSearchResults = ref<any[]>([])

async function loadCompanyUsers() {
  if (!editingCompany.value?.id) return
  const res: any = await $fetch('/api/admin/users', { query: { company_id: editingCompany.value.id } }).catch(() => ({ users: [] }))
  companyUsers.value = res.users || []
}

async function searchUsers() {
  if (userSearchQuery.value.length < 2) { userSearchResults.value = []; return }
  const res: any = await $fetch('/api/admin/users', { query: { search: userSearchQuery.value, limit: 8 } }).catch(() => ({ users: [] }))
  userSearchResults.value = (res.users || []).filter((u: any) => u.company_id !== editingCompany.value?.id)
}

async function assignUser(user: any) {
  await $fetch('/api/admin/companies/assign-user', { method: 'POST', body: { user_id: user.id, company_id: editingCompany.value.id } })
  userSearchQuery.value = ''
  userSearchResults.value = []
  await loadCompanyUsers()
}

async function removeUser(user: any) {
  await $fetch('/api/admin/companies/assign-user', { method: 'POST', body: { user_id: user.id, company_id: null } })
  await loadCompanyUsers()
}

// ── Rechnungen ───────────────────────────────────────────────────────────────
const companyInvoices = ref<any[]>([])

async function loadCompanyInvoices() {
  if (!editingCompany.value?.id) return
  try {
    const res: any = await $fetch('/api/admin/invoices/list', { query: { company_id: editingCompany.value.id } })
    companyInvoices.value = res.invoices || []
  } catch {
    companyInvoices.value = []
  }
}

function createInvoiceForCompany() {
  // Navigate to invoices page with company pre-selected
  navigateTo(`/admin/invoices?company_id=${editingCompany.value?.id}`)
}

onMounted(load)
</script>
