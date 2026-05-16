<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Leads</h1>
              <p class="text-sm text-gray-500">{{ total.toLocaleString('de-CH') }} Kontakte</p>
            </div>
          </div>
          <NuxtLink to="/admin/marketing/import" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + CSV importieren
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

      <!-- Filters -->
      <div class="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
        <input
          v-model="search"
          @keyup.enter="loadLeads"
          type="text"
          placeholder="Email, Name suchen..."
          class="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select v-model="filterStatus" @change="loadLeads" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="pending_consent">Consent ausstehend</option>
          <option value="unsubscribed">Abgemeldet</option>
          <option value="bounced">Bounced</option>
          <option value="inactive">Inaktiv</option>
        </select>
        <select v-model="filterCategory" @change="loadLeads" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Alle Kategorien</option>
          <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
        <button @click="loadLeads" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Suchen
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border overflow-hidden">
        <div v-if="loading" class="p-12 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <div v-else-if="leads.length === 0" class="p-12 text-center text-gray-500">
          <svg class="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Keine Leads gefunden
        </div>

        <table v-else class="min-w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorien</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quelle</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importiert</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="lead in leads" :key="lead.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ lead.email }}</td>
              <td class="px-4 py-3 text-gray-600">{{ [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—' }}</td>
              <td class="px-4 py-3">
                <span :class="statusBadge(lead.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ statusLabel(lead.status) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="cat in lead.categories"
                    :key="cat"
                    class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >{{ cat }}</span>
                  <span v-if="!lead.categories?.length" class="text-gray-400">—</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ lead.source || '—' }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(lead.created_at) }}</td>
              <td class="px-4 py-3">
                <button
                  @click="openEdit(lead)"
                  class="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
          <span class="text-sm text-gray-500">{{ total.toLocaleString('de-CH') }} Leads</span>
          <div class="flex gap-1">
            <button
              v-for="p in visiblePages"
              :key="p"
              @click="goToPage(p)"
              :class="[
                'px-3 py-1.5 text-sm rounded-lg',
                p === currentPage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              ]"
            >{{ p }}</button>
          </div>
          <button
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
            class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            Weiter →
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editLead" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Lead bearbeiten</h2>
          <button @click="editLead = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono">{{ editLead.email }}</div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
            <input v-model="editForm.first_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
            <input v-model="editForm.last_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select v-model="editForm.status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="pending_consent">Consent ausstehend</option>
            <option value="active">Aktiv</option>
            <option value="unsubscribed">Abgemeldet</option>
            <option value="bounced">Bounced</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-2">Kategorien</label>
          <div class="flex flex-wrap gap-2">
            <label v-for="cat in CATEGORIES" :key="cat.value" class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" :value="cat.value" v-model="editForm.categories" class="rounded" />
              <span class="text-sm text-gray-700">{{ cat.label }}</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Notiz</label>
          <textarea v-model="editForm.notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="editLead = null" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveLead" :disabled="saving" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ saving ? 'Speichere...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Leads - Marketing - Admin' })

const authStore = useAuthStore()

const CATEGORIES = [
  { value: 'auto', label: 'Auto (B)' },
  { value: 'motorrad', label: 'Motorrad (A)' },
  { value: 'lkw', label: 'LKW (C/CE)' },
  { value: 'fahrlehrer', label: 'Fahrlehrer' },
  { value: 'bus', label: 'Bus (D)' },
  { value: 'traktor', label: 'Traktor' },
]

const leads = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 50
const search = ref('')
const filterStatus = ref('all')
const filterCategory = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize))
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function loadLeads() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  loading.value = true
  try {
    const res = await $fetch<any>('/api/marketing/leads', {
      query: {
        tenantId,
        status: filterStatus.value,
        category: filterCategory.value || undefined,
        search: search.value || undefined,
        page: currentPage.value,
        limit: pageSize,
      },
    })
    leads.value = res.leads
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function goToPage(p: number) {
  currentPage.value = p
  loadLeads()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    active: 'Aktiv',
    pending_consent: 'Consent ausstehend',
    unsubscribed: 'Abgemeldet',
    bounced: 'Bounced',
    inactive: 'Inaktiv',
  }
  return map[status] ?? status
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending_consent: 'bg-yellow-100 text-yellow-700',
    unsubscribed: 'bg-gray-100 text-gray-600',
    bounced: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

// Edit
const editLead = ref<any>(null)
const editForm = reactive({ status: '', first_name: '', last_name: '', categories: [] as string[], notes: '' })
const saving = ref(false)

function openEdit(lead: any) {
  editLead.value = lead
  editForm.status = lead.status
  editForm.first_name = lead.first_name || ''
  editForm.last_name = lead.last_name || ''
  editForm.categories = [...(lead.categories || [])]
  editForm.notes = lead.notes || ''
}

async function saveLead() {
  if (!editLead.value) return
  saving.value = true
  try {
    await $fetch(`/api/marketing/leads/${editLead.value.id}`, {
      method: 'PATCH',
      body: { tenantId: authStore.userProfile?.tenant_id, ...editForm },
    })
    editLead.value = null
    await loadLeads()
  } finally {
    saving.value = false
  }
}

onMounted(loadLeads)
</script>
