<template>
  <div>
      <div class="flex items-center justify-between">
        <div class="p-4">
          <h1 class="text-2xl font-bold text-gray-900">Rechnungen</h1>
        </div>
        <div class="flex space-x-3">
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Neue Rechnung
          </button>
          <button
            @click="refreshData"
            :disabled="isLoading"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Aktualisieren
          </button>
        </div>
      </div>

    <div class="min-h-screen bg-gray-50">
      <!-- Filter und Suche -->
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="text-base font-medium text-gray-900">Filter & Suche</h3>
        </div>
        <div class="px-4 py-3">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Suchfeld -->
            <div class="flex-1 min-w-48">
              <input
                v-model="filters.search"
                type="text"
                placeholder="Suche..."
                :class="[
                  'w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  filters.search && filters.search.trim()
                    ? 'border-green-500 focus:ring-green-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                ]"
                @input="debouncedSearch"
              />
            </div>

            <!-- Status Filter -->
            <div class="relative" data-dropdown="status">
              <button
              @click.stop="toggleStatusDropdown"
              :class="[
                'inline-flex items-center px-3 py-1.5 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2',
                (filters.status?.length || 0) > 0 
                  ? 'border-green-500 bg-green-50 text-green-700 hover:bg-gray-100 focus:ring-green-500' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
              ]"
            >
              <span class="mr-2">{{ getStatusLabel() }}</span>
              <svg class="w-4 h-4" :class="(filters.status?.length || 0) > 0 ? 'text-green-700' : 'text-gray-700'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showStatusDropdown" class="absolute z-10 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
              <div class="p-2 space-y-1">
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.status?.includes('draft') || false"
                    @change="toggleStatusFilter('draft')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Entwurf</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.status?.includes('sent') || false"
                    @change="toggleStatusFilter('sent')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Versendet</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.status?.includes('paid') || false"
                    @change="toggleStatusFilter('paid')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Bezahlt</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.status?.includes('overdue') || false"
                    @change="toggleStatusFilter('overdue')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Überfällig</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.status?.includes('cancelled') || false"
                    @change="toggleStatusFilter('cancelled')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Storniert</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Zahlungsstatus Filter -->
          <div class="relative" data-dropdown="payment-status">
            <button
              @click.stop="togglePaymentStatusDropdown"
              :class="[
                'inline-flex items-center px-3 py-1.5 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2',
                (filters.payment_status?.length || 0) > 0 
                  ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
              ]"
            >
              <span class="mr-2">{{ getPaymentStatusLabel() }}</span>
              <svg class="w-4 h-4" :class="(filters.payment_status?.length || 0) > 0 ? 'text-green-700' : 'text-gray-700'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showPaymentStatusDropdown" class="absolute z-10 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
              <div class="p-2 space-y-1">
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.payment_status?.includes('pending') || false"
                    @change="togglePaymentStatusFilter('pending')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Ausstehend</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.payment_status?.includes('partial') || false"
                    @change="togglePaymentStatusFilter('partial')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Teilweise bezahlt</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.payment_status?.includes('paid') || false"
                    @change="togglePaymentStatusFilter('paid')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Vollständig bezahlt</span>
                </label>
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    :checked="filters.payment_status?.includes('overdue') || false"
                    @change="togglePaymentStatusFilter('overdue')"
                    class="mr-2 text-blue-600 keep-checkbox"
                  >
                  <span class="text-sm text-gray-700">Überfällig</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Datum Filter -->
          <div class="relative" data-dropdown="date">
            <button
              @click.stop="toggleDateDropdown"
              :class="[
                'inline-flex items-center px-3 py-1.5 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2',
                (filters.date_from || filters.date_to) 
                  ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
              ]"
            >
              <span class="mr-2">{{ getDateLabel() }}</span>
              <svg class="w-4 h-4" :class="(filters.date_from || filters.date_to) ? 'text-green-700' : 'text-gray-700'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showDateDropdown" class="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
              <div class="p-3 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Von</label>
                  <input
                    v-model="filters.date_from"
                    type="date"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Bis</label>
                  <input
                    v-model="filters.date_to"
                    type="date"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Filter anwenden Button -->
          <button
            @click="applyFilters"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Anwenden
          </button>
          
          <!-- Filter zurücksetzen Button -->
          <button
            @click="clearFilters"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Zurücksetzen
          </button>
        </div>
      </div>
    </div>
    <!-- Statistiken -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Gesamt Rechnungen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ summary.total_invoices || 0 }}</dd>
                  <dd v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Bezahlt</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(summary.paid_amount) }}</dd>
                  <dd v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Ausstehend</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(summary.pending_amount) }}</dd>
                  <dd v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Überfällig</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(summary.overdue_amount) }}</dd>
                  <dd v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rechnungsliste -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            Rechnungen ({{ totalInvoices }})
          </h3>
        </div>

        <div v-if="isLoading" class="p-6 text-center">
          <div class="inline-flex items-center">
            <svg class="animate-spin h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Lade Rechnungen...
          </div>
        </div>

        <div v-else-if="!hasInvoices" class="p-6 text-center text-gray-500">
          Keine Rechnungen gefunden.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rechnung
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kunde
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fälligkeitsdatum
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="invoice in invoices" :key="invoice.id" class="hover:bg-gray-50 cursor-pointer" @click="viewInvoice(invoice.id)">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ invoice.invoice_number }}</div>
                    <div class="text-sm text-gray-500">{{ formatDate(invoice.invoice_date) }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {{ invoice.customer_first_name }} {{ invoice.customer_last_name }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ invoice.customer_email }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(invoice.total_amount_rappen) }}
                  </div>
                  <div v-if="invoice.discount_amount_rappen > 0" class="text-sm text-gray-500">
                    Rabatt: {{ formatCurrency(invoice.discount_amount_rappen) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center space-x-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusBadgeClass(invoice.status)">
                      {{ getStatusLabel() }}
                    </span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getPaymentStatusBadgeClass(invoice.payment_status)">
                      {{ getPaymentStatusLabel() }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatDate(invoice.due_date) }}
                  </div>
                  <div v-if="isOverdue(invoice.due_date)" class="text-sm text-red-600">
                    Überfällig
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ currentTenant?.name || 'Unbekannt' }}</div>
                  <div class="text-xs text-gray-500">{{ currentTenant?.slug || 'Kein Slug' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginierung -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Zeige {{ (currentPage - 1) * itemsPerPage + 1 }} bis {{ Math.min(currentPage * itemsPerPage, totalInvoices) }} von {{ totalInvoices }} Rechnungen
            </div>
            <div class="flex space-x-2">
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              <button
                @click="changePage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
          </div>
        </div>
          </div>

    <!-- Modals -->
    <InvoiceCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onInvoiceCreated"
    />

    <InvoiceDetailModal
      v-if="showDetailModal"
      :show="showDetailModal"
      :invoice="selectedInvoice"
      :start-in-edit-mode="shouldStartInEditMode"
      @close="handleModalClose"
      @edit="handleEditInvoice"
      @send="handleSendInvoice"
      @markAsPaid="handleMarkAsPaid"
      @cancel="handleCancelInvoice"
      @updated="onInvoiceUpdated"
    />
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
// definePageMeta is auto-imported by Nuxt
import { useInvoices } from '~/composables/useInvoices'
import InvoiceCreateModal from '~/components/admin/InvoiceCreateModal.vue'
import InvoiceDetailModal from '~/components/admin/InvoiceDetailModal.vue'
import type { InvoiceStatus, PaymentStatus, InvoiceFilters } from '~/types/invoice'

// Page meta
// definePageMeta({
//   layout: 'admin',
//   middleware: ['auth']
// })

// Simple debounce implementation
const useDebounce = (callback: Function, delay: number) => {
  let timeoutId: number
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delay)
  }
}

// Composables
const { 
  invoices, 
  isLoading, 
  totalInvoices, 
  currentPage, 
  totalPages, 
  hasInvoices,
  fetchInvoices,
  fetchInvoiceSummary,
  fetchInvoiceWithItems,
  sendInvoice,
  markInvoiceAsPaid,
  cancelInvoice
} = useInvoices()

// State
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const selectedInvoiceId = ref<string>('')
const selectedInvoiceWithItems = ref<any>(null)
const shouldStartInEditMode = ref(false)
const showStatusDropdown = ref(false)
const showPaymentStatusDropdown = ref(false)
const showDateDropdown = ref(false)
const itemsPerPage = ref(10)
const currentTenant = ref<any>(null)
const summary = ref({
  total_invoices: 0,
  total_amount: 0,
  paid_amount: 0,
  pending_amount: 0,
  overdue_amount: 0,
  draft_amount: 0
})

// Computed
const selectedInvoice = computed(() => {
  return selectedInvoiceWithItems.value || invoices.value.find((invoice: any) => invoice.id === selectedInvoiceId.value) || null
})

// Filter
const filters = ref<InvoiceFilters>({
  status: [] as InvoiceStatus[],
  payment_status: [] as PaymentStatus[],
  date_from: '',
  date_to: '',
  search: ''
})

// Ensure arrays are always initialized
const ensureFilterArrays = () => {
  if (!filters.value.status) {
    filters.value.status = [] as InvoiceStatus[]
  }
  if (!filters.value.payment_status) {
    filters.value.payment_status = [] as PaymentStatus[]
  }
}

// Initialize filter arrays
ensureFilterArrays()

// Debounced search
const debouncedSearch = useDebounce(() => {
  applyFilters()
}, 500)

// Watch filter changes for debugging
watch(filters, (newFilters) => {
  console.log('👀 Filters changed:', newFilters)
}, { deep: true })

// Methods
const refreshData = async () => {
  console.log('🔄 refreshData called')
  
  // Load current tenant info
  const { getSupabase } = await import('~/utils/supabase')
  const supabase = getSupabase()
  
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
    .single()
  const tenantId = userProfile?.tenant_id
  
  if (tenantId) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', tenantId)
      .single()
    currentTenant.value = tenantData
    console.log('🔍 Current tenant:', tenantData)
  }
  
  const [invoicesResult, summaryResult] = await Promise.all([
    fetchInvoices(filters.value, currentPage.value),
    fetchInvoiceSummary()
  ])
  
  // Aktualisiere den summary ref mit den geladenen Daten
  if (summaryResult) {
    console.log('📊 Summary result received:', summaryResult)
    summary.value = summaryResult
  } else {
    console.warn('⚠️ No summary result received')
  }
}



const applyFilters = async () => {
  // Close all dropdowns
  showStatusDropdown.value = false
  showPaymentStatusDropdown.value = false
  showDateDropdown.value = false
  
  console.log('🔍 Applying filters with values:', filters.value)
  console.log('📅 Date filters:', { from: filters.value.date_from, to: filters.value.date_to })
  console.log('📊 Status filters:', filters.value.status)
  console.log('💳 Payment status filters:', filters.value.payment_status)
  console.log('🔍 Search term:', filters.value.search)
  
  // Debug: Check if filters are actually arrays
  console.log('🔍 Status filters type:', Array.isArray(filters.value.status))
  console.log('🔍 Payment status filters type:', Array.isArray(filters.value.payment_status))
  console.log('🔍 Status filters length:', filters.value.status?.length)
  console.log('🔍 Payment status filters length:', filters.value.payment_status?.length)
  
  await fetchInvoices(filters.value, 1)
}

const clearFilters = async () => {
  filters.value = {
    status: [] as InvoiceStatus[],
    payment_status: [] as PaymentStatus[],
    date_from: '',
    date_to: '',
    search: ''
  }
  
  // Ensure arrays are initialized
  ensureFilterArrays()
  
  console.log('🧹 Filters cleared, reloading data...')
  await fetchInvoices(filters.value, 1)
}

const changePage = async (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    await fetchInvoices(filters.value, page)
  }
}

const viewInvoice = async (id: string) => {
  // Reset den Flag für den Bearbeitungsmodus
  shouldStartInEditMode.value = false
  
  selectedInvoiceId.value = id
  const invoiceWithItems = await fetchInvoiceWithItems(id)
  selectedInvoiceWithItems.value = invoiceWithItems
  showDetailModal.value = true
}

const handleEditInvoice = async (id: string) => {
  try {
    console.log('✏️ Edit invoice requested:', id)
    
    // Setze den Flag für den Bearbeitungsmodus
    shouldStartInEditMode.value = true
    
    // Lade die vollständigen Rechnungsdaten mit Items
    selectedInvoiceId.value = id
    const invoiceWithItems = await fetchInvoiceWithItems(id)
    selectedInvoiceWithItems.value = invoiceWithItems
    showDetailModal.value = true
    
    // Das Modal wird geöffnet und automatisch in den Bearbeitungsmodus geschaltet
    
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Rechnung:', error)
  }
}

const handleSendInvoice = async (id: string) => {
  try {
    console.log('📤 Send invoice requested:', id)
    
    // Verwende die Funktion aus dem useInvoices Composable
    const result = await sendInvoice(id)
    
    if (result && 'success' in result && result.success) {
      console.log('✅ Invoice sent successfully')
      // Modal schließen und Daten neu laden
      showDetailModal.value = false
      await refreshData()
    } else {
      console.error('❌ Failed to send invoice:', result)
    }
  } catch (error) {
    console.error('Fehler beim Versenden der Rechnung:', error)
  }
}

const handleMarkAsPaid = async (id: string) => {
  try {
    console.log('💰 Mark as paid requested:', id)
    
    // Verwende die Funktion aus dem useInvoices Composable
    const result = await markInvoiceAsPaid(id, 'paid')
    
    if (result && 'success' in result && result.success) {
      console.log('✅ Invoice marked as paid successfully')
      // Modal schließen und Daten neu laden
      showDetailModal.value = false
      await refreshData()
    } else {
      console.error('❌ Failed to mark invoice as paid:', result)
    }
  } catch (error) {
    console.error('Fehler beim Markieren als bezahlt:', error)
  }
}

const handleCancelInvoice = async (id: string) => {
  try {
    console.log('❌ Cancel invoice requested:', id)
    
    // Verwende die Funktion aus dem useInvoices Composable
    const result = await cancelInvoice(id)
    
    if (result && 'success' in result && result.success) {
      console.log('✅ Invoice cancelled successfully')
      // Modal schließen und Daten neu laden
      showDetailModal.value = false
      await refreshData()
    } else {
      console.error('❌ Failed to cancel invoice:', result)
    }
  } catch (error) {
    console.error('Fehler beim Stornieren der Rechnung:', error)
  }
}

const onInvoiceCreated = async () => {
  showCreateModal.value = false
  await refreshData()
}

const handleModalClose = () => {
  // Reset den Flag für den Bearbeitungsmodus
  shouldStartInEditMode.value = false
  showDetailModal.value = false
}

const onInvoiceUpdated = async () => {
  showDetailModal.value = false
  await refreshData()
}

// Utility functions
const formatCurrency = (rappen: number): string => {
  if (rappen === 0) return 'CHF 0.-'
  return `CHF ${rappen}.-`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date()
}

// Dropdown helper functions
const getStatusLabel = (status?: string) => {
  if (!status || !filters.value.status || filters.value.status.length === 0) return 'Alle Status'
  if (filters.value.status.length === 1) {
    const status = filters.value.status[0]
    const labels: Record<string, string> = {
      'draft': 'Entwurf',
      'sent': 'Versendet',
      'paid': 'Bezahlt',
      'overdue': 'Überfällig',
      'cancelled': 'Storniert'
    }
    return labels[status] || status
  }
  return `${filters.value.status.length} Status`
}

const getPaymentStatusLabel = (status?: string) => {
  if (!status || !filters.value.payment_status || filters.value.payment_status.length === 0) return 'Alle Zahlungsstatus'
  if (filters.value.payment_status.length === 1) {
    const status = filters.value.payment_status[0]
    const labels: Record<string, string> = {
      'pending': 'Ausstehend',
      'partial': 'Teilweise bezahlt',
      'paid': 'Vollständig bezahlt',
      'overdue': 'Überfällig'
    }
    return labels[status] || status
  }
  return `${filters.value.payment_status.length} Status`
}

// Badge styling functions
const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-800',
    'sent': 'bg-blue-100 text-blue-800',
    'paid': 'bg-green-100 text-green-800',
    'overdue': 'bg-red-100 text-red-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getPaymentStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'partial': 'bg-orange-100 text-orange-800',
    'paid': 'bg-green-100 text-green-800',
    'overdue': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getDateLabel = () => {
  if (!filters.value.date_from && !filters.value.date_to) return 'Alle Daten'
  if (filters.value.date_from && filters.value.date_to) {
    return `${formatDate(filters.value.date_from)} - ${formatDate(filters.value.date_to)}`
  }
  if (filters.value.date_from) return `Ab ${formatDate(filters.value.date_from)}`
  if (filters.value.date_to) return `Bis ${formatDate(filters.value.date_to)}`
  return 'Alle Daten'
}

// Toggle functions that close other dropdowns
const toggleStatusDropdown = () => {
  showPaymentStatusDropdown.value = false
  showDateDropdown.value = false
  showStatusDropdown.value = !showStatusDropdown.value
}

const togglePaymentStatusDropdown = () => {
  showStatusDropdown.value = false
  showDateDropdown.value = false
  showPaymentStatusDropdown.value = !showPaymentStatusDropdown.value
}

const toggleDateDropdown = () => {
  showStatusDropdown.value = false
  showPaymentStatusDropdown.value = false
  showDateDropdown.value = !showDateDropdown.value
}

// Filter toggle functions
const toggleStatusFilter = (status: string) => {
  // Ensure arrays are initialized
  ensureFilterArrays()
  
  const index = filters.value.status!.indexOf(status as InvoiceStatus)
  if (index > -1) {
    filters.value.status!.splice(index, 1)
  } else {
    filters.value.status!.push(status as InvoiceStatus)
  }
  console.log('🔍 Status filter toggled:', status, 'New status array:', filters.value.status)
  // Apply filters immediately
  applyFilters()
}

const togglePaymentStatusFilter = (status: string) => {
  // Ensure arrays are initialized
  ensureFilterArrays()
  
  const index = filters.value.payment_status!.indexOf(status as PaymentStatus)
  if (index > -1) {
    filters.value.payment_status!.splice(index, 1)
  } else {
    filters.value.payment_status!.push(status as PaymentStatus)
  }
  console.log('💳 Payment status filter toggled:', status, 'New payment status array:', filters.value.payment_status)
  // Apply filters immediately
  applyFilters()
}

const toggleDateFilter = (type: 'from' | 'to', date: string) => {
  if (type === 'from') {
    filters.value.date_from = date
  } else {
    filters.value.date_to = date
  }
  applyFilters()
}

// Click outside handler
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  
  // Use setTimeout to avoid immediate closing when clicking buttons
  const timeoutId = setTimeout(() => {
    // Check if click is outside status dropdown
    if (!target.closest('[data-dropdown="status"]')) {
      showStatusDropdown.value = false
    }
    
    // Check if click is outside payment status dropdown
    if (!target.closest('[data-dropdown="payment-status"]')) {
      showPaymentStatusDropdown.value = false
    }
    
    // Check if click is outside date dropdown
    if (!target.closest('[data-dropdown="date"]')) {
      showDateDropdown.value = false
    }
  }, 10)
}

// Lifecycle
onMounted(async () => {
  console.log('🚀 onMounted called')
  console.log('🔍 Initial summary state:', summary.value)
  await refreshData()
  console.log('✅ refreshData completed')
  console.log('🔍 Final summary state:', summary.value)
  
  // Add click outside listener to close dropdowns
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Clean up event listener
  document.removeEventListener('click', handleClickOutside)
})
</script>


