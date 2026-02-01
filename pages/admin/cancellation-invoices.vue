<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Stornierungs- & Rückerstattungs-Rechnungen</h1>
        <p class="mt-2 text-gray-600">
          Übersicht aller Stornierungs- und Rückerstattungs-Rechnungen und deren Zahlungsstatus
        </p>
        <p v-if="currentTenant" class="text-sm text-gray-500 mt-1">
          Tenant: <span class="font-medium text-blue-600">{{ currentTenant.name }}</span>
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg">
              <div class="text-2xl text-blue-600">📄</div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Gesamt</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.total }}</p>
              <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <div class="text-2xl text-yellow-600">⏳</div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Ausstehend</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.pending }}</p>
              <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <div class="text-2xl text-green-600">✅</div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Bezahlt</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.paid }}</p>
              <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-red-100 rounded-lg">
              <div class="text-2xl text-red-600">💰</div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Gesamtbetrag</p>
              <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(stats.totalAmount) }}</p>
              <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              v-model="filters.status" 
              class="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle</option>
              <option value="pending">Ausstehend</option>
              <option value="paid">Bezahlt</option>
              <option value="overdue">Überfällig</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Zeitraum</label>
            <select 
              v-model="filters.timeRange" 
              class="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle</option>
              <option value="today">Heute</option>
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
            </select>
          </div>

          <button
            @click="loadCancellationInvoices"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      <!-- Invoices Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Stornierungs- & Rückerstattungs-Rechnungen</h3>
        </div>

        <div v-if="isLoading" class="p-8 text-center">
          <div class="text-gray-500">Lade Rechnungen...</div>
        </div>

        <div v-else-if="cancellationInvoices.length === 0" class="p-8 text-center">
          <div class="text-gray-500">Keine Stornierungs- oder Rückerstattungs-Rechnungen gefunden</div>
          <p v-if="currentTenant" class="text-sm text-gray-400 mt-2">
            Tenant: {{ currentTenant.name }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Termin
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schüler
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="invoice in cancellationInvoices" :key="invoice.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ invoice.appointment_title || 'Unbekannt' }}
                  </div>
                  <div class="text-sm text-gray-500">
                    ID: {{ invoice.appointment_id }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ invoice.student_name || 'Unbekannt' }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatDate(invoice.appointment_date) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getInvoiceTypeClass(invoice.invoice_type)">
                    {{ getInvoiceTypeText(invoice.invoice_type) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900" :class="invoice.amount_rappen < 0 ? 'text-red-600' : 'text-gray-900'">
                    {{ formatCurrency(invoice.amount_rappen) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusClass(invoice.status)">
                    {{ getStatusText(invoice.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatDate(invoice.created_at) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ currentTenant?.name || 'Unbekannt' }}</div>
                  <div class="text-xs text-gray-500">{{ currentTenant?.slug || 'Kein Slug' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    v-if="invoice.status === 'pending'"
                    @click="markInvoiceAsPaid(invoice.id)"
                    class="text-green-600 hover:text-green-900 mr-3"
                  >
                    ✅ Bezahlt
                  </button>
                  <button
                    @click="viewInvoiceDetails(invoice)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    👁️ Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Invoice Details Modal -->
    <div v-if="showInvoiceModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Rechnungsdetails</h3>
          <button
            @click="showInvoiceModal = false"
            class="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div v-if="selectedInvoice" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Termin</label>
              <p class="mt-1 text-sm text-gray-900">{{ selectedInvoice.appointment_title }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Schüler</label>
              <p class="mt-1 text-sm text-gray-900">{{ selectedInvoice.student_name }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Datum</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedInvoice.appointment_date) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Betrag</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatCurrency(selectedInvoice.amount_rappen) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Status</label>
              <span :class="getStatusClass(selectedInvoice.status)">
                {{ getStatusText(selectedInvoice.status) }}
              </span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Erstellt</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedInvoice.created_at) }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Beschreibung</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedInvoice.description }}</p>
          </div>

          <div v-if="selectedInvoice.paid_at">
            <label class="block text-sm font-medium text-gray-700">Bezahlt am</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedInvoice.paid_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'

// State
const isLoading = ref(false)
const cancellationInvoices = ref<any[]>([])
const showInvoiceModal = ref(false)
const selectedInvoice = ref<any>(null)
const currentTenant = ref<any>(null)

// Filters
const filters = ref({
  status: '',
  timeRange: 'all'
})

// Stats
const stats = computed(() => {
  const total = cancellationInvoices.value.length
  const pending = cancellationInvoices.value.filter(inv => inv.status === 'pending').length
  const paid = cancellationInvoices.value.filter(inv => inv.status === 'paid').length
  const totalAmount = cancellationInvoices.value.reduce((sum, inv) => sum + (inv.amount_rappen || 0), 0)

  return { total, pending, paid, totalAmount }
})

// ✅ Load cancellation invoices via secure API
const loadCancellationInvoices = async () => {
  try {
    isLoading.value = true

    const response = await $fetch('/api/admin/cancellation-invoices', {
      method: 'GET',
      query: {
        status: filters.value.status || undefined,
        search: filters.value.search || undefined
      }
    }) as any

    if (response?.tenant) {
      currentTenant.value = response.tenant
      logger.debug('🔍 Current tenant:', response.tenant)
    }

    // Transform data
    cancellationInvoices.value = (response?.invoices || []).map((invoice: any) => ({
      ...invoice,
      appointment_title: invoice.appointments?.title,
      appointment_date: invoice.appointments?.start_time,
      student_name: invoice.appointments?.users 
        ? `${invoice.appointments.users.first_name} ${invoice.appointments.users.last_name}`
        : 'Unbekannt'
    }))

    logger.debug('✅ Cancellation invoices loaded via API:', cancellationInvoices.value.length)

  } catch (err: any) {
    console.error('❌ Error loading cancellation invoices:', err)
  } finally {
    isLoading.value = false
  }
}

// ✅ Mark invoice as paid via secure API
const markInvoiceAsPaid = async (invoiceId: string) => {
  try {
    const response = await $fetch('/api/admin/invoice-update-status', {
      method: 'POST',
      body: { invoice_id: invoiceId, action: 'paid' }
    }) as any
    
    if (!data) throw new Error('Failed to update invoice')

    logger.debug('✅ Invoice marked as paid via API:', data)

    // Reload invoices
    await loadCancellationInvoices()

  } catch (err: any) {
    console.error('❌ Error marking invoice as paid:', err)
  }
}

// View invoice details
const viewInvoiceDetails = (invoice: any) => {
  selectedInvoice.value = invoice
  showInvoiceModal.value = true
}

// Helper functions
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unbekannt'
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatCurrency = (rappen: number) => {
  if (!rappen) return '0.00 CHF'
  return `${(rappen / 100).toFixed(2)} CHF`
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'Ausstehend',
    'paid': 'Bezahlt',
    'overdue': 'Überfällig',
    'cancelled': 'Storniert'
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'pending': 'text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs font-medium',
    'paid': 'text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium',
    'overdue': 'text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-medium',
    'cancelled': 'text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium'
  }
  return classMap[status] || 'text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium'
}

const getInvoiceTypeText = (invoiceType: string) => {
  const typeMap: Record<string, string> = {
    'cancellation_fee': 'Stornogebühr',
    'refund': 'Rückerstattung',
    'regular': 'Regulär'
  }
  return typeMap[invoiceType] || invoiceType
}

const getInvoiceTypeClass = (invoiceType: string) => {
  const classMap: Record<string, string> = {
    'cancellation_fee': 'text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-medium',
    'refund': 'text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium',
    'regular': 'text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs font-medium'
  }
  return classMap[invoiceType] || 'text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium'
}

// Load on mount
onMounted(() => {
  loadCancellationInvoices()
})
</script>
