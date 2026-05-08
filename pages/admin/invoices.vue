<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">

    <!-- ═══ PAGE HEADER ═══ -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Rechnungen</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ totalInvoices }} Rechnungen · CHF {{ formatCurrency(summary.paid_amount).replace('CHF ', '') }} bezahlt
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showCamtModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <span class="hidden sm:inline">CAMT Import</span>
        </button>
        <button @click="showCreateModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Neue Rechnung
        </button>
        <button @click="refreshData" :disabled="isLoading"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50 shadow-sm"
          title="Aktualisieren">
          <svg class="h-4 w-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ═══ KPI CARDS ═══ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Gesamt</p>
        <p class="text-2xl font-bold text-gray-900">{{ summary.total_invoices || 0 }}</p>
        <p class="text-xs text-gray-400 mt-1">Rechnungen</p>
      </div>
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-sm p-5">
        <p class="text-xs font-semibold text-emerald-100 uppercase tracking-widest mb-2">Bezahlt</p>
        <p class="text-2xl font-bold text-white">{{ formatCurrency(summary.paid_amount) }}</p>
        <p class="text-xs text-emerald-200 mt-1">Eingegangen</p>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Ausstehend</p>
        <p class="text-2xl font-bold text-amber-600">{{ formatCurrency(summary.pending_amount) }}</p>
        <p class="text-xs text-gray-400 mt-1">Offen</p>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Überfällig</p>
        <p class="text-2xl font-bold" :class="(summary.overdue_amount || 0) > 0 ? 'text-red-600' : 'text-gray-400'">
          {{ formatCurrency(summary.overdue_amount) }}
        </p>
        <p class="text-xs text-gray-400 mt-1">Fällig</p>
      </div>
    </div>

    <!-- ═══ FILTER BAR ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 p-4">
        <!-- Suchfeld -->
        <div class="flex-1 min-w-[200px] relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Name, Rechnungsnummer…"
            :class="[
              'w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2',
              filters.search?.trim() ? 'border-emerald-400 focus:ring-emerald-300' : 'border-gray-200 focus:ring-blue-300'
            ]"
            @input="debouncedSearch"
          />
        </div>

        <!-- Status Filter -->
        <div class="relative" data-dropdown="status">
          <button @click.stop="toggleStatusDropdown"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors',
              (filters.status?.length || 0) > 0
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            ]">
            {{ getStatusLabel() }}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-if="showStatusDropdown" class="absolute z-10 mt-1.5 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 space-y-0.5">
            <label v-for="[val, lbl] in [['draft','Entwurf'],['sent','Versendet'],['paid','Bezahlt'],['overdue','Überfällig'],['cancelled','Storniert']]" :key="val"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" :checked="filters.status?.includes(val) || false" @change="toggleStatusFilter(val)" class="rounded keep-checkbox"/>
              {{ lbl }}
            </label>
          </div>
        </div>

        <!-- Zahlungsstatus Filter -->
        <div class="relative" data-dropdown="payment-status">
          <button @click.stop="togglePaymentStatusDropdown"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors',
              (filters.payment_status?.length || 0) > 0
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            ]">
            {{ getPaymentStatusLabel() }}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-if="showPaymentStatusDropdown" class="absolute z-10 mt-1.5 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 space-y-0.5">
            <label v-for="[val, lbl] in [['pending','Ausstehend'],['partial','Teilweise bezahlt'],['paid','Vollständig bezahlt'],['overdue','Überfällig']]" :key="val"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" :checked="filters.payment_status?.includes(val) || false" @change="togglePaymentStatusFilter(val)" class="rounded keep-checkbox"/>
              {{ lbl }}
            </label>
          </div>
        </div>

        <!-- Datum Filter -->
        <div class="relative" data-dropdown="date">
          <button @click.stop="toggleDateDropdown"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors',
              (filters.date_from || filters.date_to)
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            ]">
            {{ getDateLabel() }}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-if="showDateDropdown" class="absolute z-10 mt-1.5 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Von</label>
              <input v-model="filters.date_from" type="date" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Bis</label>
              <input v-model="filters.date_to" type="date" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            </div>
          </div>
        </div>

        <!-- Apply + Reset -->
        <button @click="applyFilters"
          class="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
          Anwenden
        </button>
        <button @click="clearFilters"
          class="px-4 py-2 text-sm font-medium rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
          Reset
        </button>
      </div>
    </div>

    <!-- ═══ INVOICE TABLE ═══ -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h3 class="text-sm font-bold text-gray-900">Rechnungen <span class="text-gray-400 font-normal">({{ totalInvoices }})</span></h3>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-16 gap-2 text-gray-400">
        <svg class="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Lade Rechnungen…
      </div>

      <div v-else-if="!hasInvoices" class="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p class="text-sm font-medium">Keine Rechnungen gefunden</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50/80">
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rechnung</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kunde</th>
              <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Betrag</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fällig</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="invoice in invoices" :key="invoice.id"
              class="hover:bg-blue-50/40 cursor-pointer transition-colors group"
              @click="viewInvoice(invoice.id)">
              <td class="px-5 py-3.5">
                <p class="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{{ invoice.invoice_number }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(invoice.invoice_date) }}</p>
              </td>
              <td class="px-5 py-3.5">
                <p class="text-sm font-medium text-gray-900">{{ invoice.customer_first_name }} {{ invoice.customer_last_name }}</p>
                <p class="text-xs text-gray-400 truncate max-w-[200px]">{{ invoice.customer_email }}</p>
              </td>
              <td class="px-5 py-3.5 text-right">
                <p class="text-sm font-bold text-gray-900">{{ formatCurrency(invoice.total_amount_rappen) }}</p>
                <p v-if="invoice.discount_amount_rappen > 0" class="text-xs text-emerald-600 mt-0.5">-{{ formatCurrency(invoice.discount_amount_rappen) }}</p>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex flex-wrap gap-1">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="getStatusBadgeClass(invoice.status)">
                    {{ getStatusLabel() }}
                  </span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="getPaymentStatusBadgeClass(invoice.payment_status)">
                    {{ getPaymentStatusLabel() }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <p class="text-sm text-gray-700">{{ formatDate(invoice.due_date) }}</p>
                <p v-if="isOverdue(invoice.due_date)" class="text-xs text-red-600 font-semibold mt-0.5">Überfällig</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
        <p class="text-xs text-gray-500">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, totalInvoices) }} von {{ totalInvoices }}
        </p>
        <div class="flex items-center gap-2">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1"
            class="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Zurück
          </button>
          <span class="text-xs text-gray-400 font-medium">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages"
            class="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Weiter →
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CamtImportModal
      v-model="showCamtModal"
      @done="refreshData"
    />

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
import { navigateTo } from '#app'
import { useInvoices } from '~/composables/useInvoices'
import { useAuthStore } from '~/stores/auth'
import InvoiceCreateModal from '~/components/admin/InvoiceCreateModal.vue'
import InvoiceDetailModal from '~/components/admin/InvoiceDetailModal.vue'
import CamtImportModal from '~/components/admin/CamtImportModal.vue'
import type { InvoiceStatus, PaymentStatus, InvoiceFilters } from '~/types/invoice'

// Page meta
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Auth check
const authStore = useAuthStore()

// Prüfe Authentifizierung direkt in der Komponente
onMounted(async () => {
  logger.debug('🔍 Invoices page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading invoices...')
})

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
const showCamtModal = ref(false)
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
  logger.debug('👀 Filters changed:', newFilters)
}, { deep: true })

// Methods
const refreshData = async () => {
  logger.debug('🔄 refreshData called')
  
  // Load current tenant info
  const { getSupabase } = await import('~/utils/supabase')
  const supabase = getSupabase()
  
  const currentUser = authStore.user // ✅ MIGRATED
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
    logger.debug('🔍 Current tenant:', tenantData)
  }
  
  const [invoicesResult, summaryResult] = await Promise.all([
    fetchInvoices(filters.value, currentPage.value),
    fetchInvoiceSummary()
  ])
  
  // Aktualisiere den summary ref mit den geladenen Daten
  if (summaryResult) {
    logger.debug('📊 Summary result received:', summaryResult)
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
  
  logger.debug('🔍 Applying filters with values:', filters.value)
  logger.debug('📅 Date filters:', { from: filters.value.date_from, to: filters.value.date_to })
  logger.debug('📊 Status filters:', filters.value.status)
  logger.debug('💳 Payment status filters:', filters.value.payment_status)
  logger.debug('🔍 Search term:', filters.value.search)
  
  // Debug: Check if filters are actually arrays
  logger.debug('🔍 Status filters type:', Array.isArray(filters.value.status))
  logger.debug('🔍 Payment status filters type:', Array.isArray(filters.value.payment_status))
  logger.debug('🔍 Status filters length:', filters.value.status?.length)
  logger.debug('🔍 Payment status filters length:', filters.value.payment_status?.length)
  
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
  
  logger.debug('🧹 Filters cleared, reloading data...')
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
    logger.debug('✏️ Edit invoice requested:', id)
    
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
    logger.debug('📤 Send invoice requested:', id)
    
    // Verwende die Funktion aus dem useInvoices Composable
    const result = await sendInvoice(id)
    
    if (result && 'success' in result && result.success) {
      logger.debug('✅ Invoice sent successfully')
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
    logger.debug('💰 Mark as paid requested:', id)
    
    // Verwende die Funktion aus dem useInvoices Composable
    const result = await markInvoiceAsPaid(id, 'paid')
    
    if (result && 'success' in result && result.success) {
      logger.debug('✅ Invoice marked as paid successfully')
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
    logger.debug('❌ Cancel invoice requested:', id)
    
    // Verwende die Funktion aus dem useInvoices Composable
    const result = await cancelInvoice(id)
    
    if (result && 'success' in result && result.success) {
      logger.debug('✅ Invoice cancelled successfully')
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
  logger.debug('🔍 Status filter toggled:', status, 'New status array:', filters.value.status)
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
  logger.debug('💳 Payment status filter toggled:', status, 'New payment status array:', filters.value.payment_status)
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
  logger.debug('🚀 onMounted called')
  logger.debug('🔍 Initial summary state:', summary.value)
  await refreshData()
  logger.debug('✅ refreshData completed')
  logger.debug('🔍 Final summary state:', summary.value)
  
  // Add click outside listener to close dropdowns
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Clean up event listener
  document.removeEventListener('click', handleClickOutside)
})
</script>


