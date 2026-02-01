<!-- pages/admin/product-sales.vue -->
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            📊 Produktverkäufe Übersicht
          </h1>
          <p class="text-gray-600">
            Alle Verkäufe - sowohl aus dem Online-Shop als auch direkte Verkäufe
          </p>
          <p v-if="currentTenant" class="text-sm text-gray-500 mt-1">
            Tenant: <span class="font-medium text-blue-600">{{ currentTenant.name }}</span>
          </p>
        </div>
        <div class="flex space-x-3">
          <button
            @click="openProductSaleModal"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
          >
            ➕ Neuer Verkauf
          </button>
          <button
            @click="openAnonymousSaleModal"
            class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex-shrink-0"
          >
            👤 Anonymer Verkauf
          </button>
          <NuxtLink
            :to="`/shop?tenant=${currentTenant?.slug || 'driving-team'}`"
            target="_blank"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            🛒 Shop öffnen
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Alle Verkäufe</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalSales }}</p>
            <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">📊</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Shop-Verkäufe</p>
            <p class="text-2xl font-bold text-green-600">{{ shopSales }}</p>
            <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">🛒</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Direkte Verkäufe</p>
            <p class="text-2xl font-bold text-purple-600">{{ directSales }}</p>
            <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">💼</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Anonyme Verkäufe</p>
            <p class="text-2xl font-bold text-orange-600">{{ anonymousSales }}</p>
            <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">👤</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Gesamtumsatz</p>
            <p class="text-2xl font-bold text-indigo-600">CHF {{ totalRevenue }}</p>
            <p v-if="currentTenant" class="text-xs text-gray-500">{{ currentTenant.name }}</p>
          </div>
          <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <span class="text-indigo-600 text-xl">💰</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Verkaufstyp</label>
          <select
            v-model="selectedSaleType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Typen</option>
            <option value="shop">Shop-Verkäufe</option>
            <option value="direct">Direkte Verkäufe</option>
            <option value="anonymous">Anonyme Verkäufe</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
          <select
            v-model="selectedTimeframe"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Zeit</option>
            <option value="today">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
            <option value="year">Dieses Jahr</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Kunde oder Produkt suchen..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="clearFilters"
            class="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Filter löschen
          </button>
        </div>
      </div>
    </div>

    <!-- Sales Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">
          Verkaufsübersicht ({{ filteredSales.length }} von {{ totalSales }})
        </h3>
      </div>
      
      <div v-if="isLoading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Lade Verkäufe...</p>
      </div>

      <div v-else-if="filteredSales.length === 0" class="p-8 text-center">
        <div class="text-gray-400 text-6xl mb-4">📦</div>
        <p class="text-gray-600 text-lg mb-2">Keine Verkäufe gefunden</p>
        <p class="text-gray-500">Versuchen Sie andere Filter oder erstellen Sie einen neuen Verkauf</p>
        <p v-if="currentTenant" class="text-sm text-gray-400 mt-2">
          Tenant: {{ currentTenant.name }}
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verkauf
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kunde
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produkte
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Betrag
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="sale in filteredSales" :key="sale.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">#{{ sale.id.slice(-8) }}</div>
                <div class="text-xs text-gray-500">{{ sale.sale_type === 'shop' ? '🛒 Shop' : '💼 Direkt' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ sale.customer_name }}</div>
                <div class="text-xs text-gray-500">{{ sale.customer_email }}</div>
                <div v-if="sale.customer_phone" class="text-xs text-gray-500">{{ sale.customer_phone }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ sale.product_count }} Produkt(e)</div>
                <div class="text-xs text-gray-500 max-w-xs truncate">{{ sale.product_names }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">CHF {{ (sale.total_amount_rappen / 100).toFixed(2) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(sale.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ getStatusText(sale.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(sale.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="sale.sale_type === 'shop' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'" 
                      class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ sale.sale_type === 'shop' ? 'Shop' : 'Direkt' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ currentTenant?.name || 'Unbekannt' }}</div>
                <div class="text-xs text-gray-500">{{ currentTenant?.slug || 'Kein Slug' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  <button
                    @click="viewSaleDetails(sale)"
                    class="text-blue-600 hover:text-blue-900 p-1"
                    title="Details anzeigen"
                  >
                    👁️
                  </button>
                  <button
                    v-if="sale.sale_type === 'direct'"
                    @click="editSale(sale)"
                    class="text-green-600 hover:text-green-900 p-1"
                    title="Verkauf bearbeiten"
                  >
                    ✏️
                  </button>
                  <button
                    @click="duplicateSale(sale)"
                    class="text-purple-600 hover:text-purple-900 p-1"
                    title="Verkauf duplizieren"
                  >
                    📋
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Product Sale Modal -->
    <ProductSaleModal
      v-if="showProductSaleModal"
      :is-visible="showProductSaleModal"
      @close="closeProductSaleModal"
      @sale-completed="handleSaleCompleted"
    />

    <!-- Anonymous Sale Modal -->
    <div v-if="showAnonymousSaleModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">👤 Anonymer Verkauf</h3>
            <button
              @click="closeAnonymousSaleModal"
              class="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Kundenname (optional)</label>
              <input
                v-model="anonymousCustomerName"
                type="text"
                placeholder="z.B. 'Walk-in Customer'"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Zahlungsart</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="anonymousPaymentMethod"
                    type="radio"
                    value="cash"
                    class="mr-2"
                  />
                  <span>💵 Bar (sofort bezahlt)</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="anonymousPaymentMethod"
                    type="radio"
                    value="card"
                    class="mr-2"
                  />
                  <span>💳 Karte (Wallee)</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="anonymousPaymentMethod"
                    type="radio"
                    value="twint"
                    class="mr-2"
                  />
                  <span>📱 Twint (Wallee)</span>
                </label>
              </div>
            </div>
            
            <div v-if="anonymousPaymentMethod === 'cash'">
              <label class="block text-sm font-medium text-gray-700 mb-2">Notizen (optional)</label>
              <textarea
                v-model="anonymousCustomerNotes"
                rows="3"
                placeholder="Zusätzliche Informationen..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>
            
            <div v-if="anonymousPaymentMethod !== 'cash'" class="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div class="flex">
                <div class="flex-shrink-0">
                  <span class="text-blue-400">💳</span>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-blue-700">
                    <strong>Online-Zahlung:</strong> Nach der Produktauswahl wird der Kunde zur Wallee-Zahlungsseite weitergeleitet. 
                    Der Verkauf wird erst nach erfolgreicher Zahlung abgeschlossen.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="bg-orange-50 border border-orange-200 rounded-md p-3">
              <div class="flex">
                <div class="flex-shrink-0">
                  <span class="text-orange-400">ℹ️</span>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-orange-700">
                    <strong>Hinweis:</strong> 
                    <span v-if="anonymousPaymentMethod === 'cash'">
                      Der Verkauf wird dem Mock-Kunden "Anonymer Kunde" zugeordnet und sofort als bezahlt markiert.
                    </span>
                    <span v-else>
                      Der Verkauf wird dem Mock-Kunden "Anonymer Kunde" zugeordnet. Nach der Produktauswahl erfolgt die Online-Zahlung.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 mt-6">
            <button
              @click="closeAnonymousSaleModal"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Abbrechen
            </button>
            <button
              @click="createAnonymousSale"
              class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Verkauf erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'
import { useAuthStore } from '~/stores/auth'
import ProductSaleModal from '~/components/ProductSaleModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Types
interface ProductSale {
  id: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  product_count: number
  product_names: string
  total_amount_rappen: number
  status: string
  created_at: string
  sale_type: 'shop' | 'direct' | 'anonymous' // Added sale_type
}

// State
const sales = ref<ProductSale[]>([])
const isLoading = ref(false)
const searchTerm = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const selectedStatus = ref('')
const selectedSaleType = ref('') // Added for filtering by sale type
const selectedTimeframe = ref('all') // Added for filtering by timeframe
const showProductSaleModal = ref(false)
const showAnonymousSaleModal = ref(false)
const anonymousCustomerName = ref('')
const anonymousCustomerNotes = ref('')
const anonymousPaymentMethod = ref('cash') // Added for anonymous sale payment method
const currentTenant = ref<any>(null)

// Computed
const filteredSales = computed(() => {
  let filtered = sales.value

  // Sale Type filter
  if (selectedSaleType.value) {
    filtered = filtered.filter(sale => sale.sale_type === selectedSaleType.value)
  }

  // Status filter
  if (selectedStatus.value) {
    filtered = filtered.filter(sale => sale.status === selectedStatus.value)
  }

  // Timeframe filter
  if (selectedTimeframe.value === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    filtered = filtered.filter(sale => new Date(sale.created_at) >= today)
  } else if (selectedTimeframe.value === 'week') {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // Start of the current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0)
    filtered = filtered.filter(sale => new Date(sale.created_at) >= startOfWeek)
  } else if (selectedTimeframe.value === 'month') {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    filtered = filtered.filter(sale => new Date(sale.created_at) >= startOfMonth)
  } else if (selectedTimeframe.value === 'year') {
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    startOfYear.setHours(0, 0, 0, 0)
    filtered = filtered.filter(sale => new Date(sale.created_at) >= startOfYear)
  }

  // Search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(sale => 
      sale.customer_name?.toLowerCase().includes(search) ||
      sale.customer_email?.toLowerCase().includes(search) ||
      sale.customer_phone?.includes(search) ||
      sale.product_names.toLowerCase().includes(search)
    )
  }

  // Date filters (if searchTerm is empty, apply date filters)
  if (searchTerm.value === '') {
    if (dateFrom.value) {
      const fromDate = new Date(dateFrom.value)
      filtered = filtered.filter(sale => new Date(sale.created_at) >= fromDate)
    }

    if (dateTo.value) {
      const toDate = new Date(dateTo.value)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(sale => new Date(sale.created_at) <= toDate)
    }
  }

  return filtered
})

const totalSales = computed(() => sales.value.length)
const totalRevenue = computed(() => 
  sales.value.reduce((sum, sale) => sum + (sale.total_amount_rappen / 100), 0)
)
const shopSales = computed(() => sales.value.filter(sale => sale.sale_type === 'shop').length)
const directSales = computed(() => sales.value.filter(sale => sale.sale_type === 'direct').length)
const anonymousSales = computed(() => sales.value.filter(sale => sale.sale_type === 'anonymous').length)

// Methods
const loadSales = async () => {
  isLoading.value = true
  try {
    logger.debug('🔄 Loading product sales via API...')
    
    // ✅ Use new secure API instead of direct DB queries
    const response = await $fetch('/api/admin/get-product-sales', {
      method: 'GET',
      query: { limit: 1000, offset: 0 }
    }) as any

    if (!response.success) {
      throw new Error(response.error || 'Failed to load product sales')
    }

    // ✅ Set tenant info from API response
    if (response.tenant) {
      currentTenant.value = response.tenant
      logger.debug('🔍 Current tenant:', response.tenant)
    }

    // ✅ All sales data from API (direct, anonymous, shop)
    sales.value = response.data || []

    logger.debug('✅ All sales loaded from API:', {
      total: sales.value.length,
      direct: sales.value.filter(s => s.sale_type === 'direct').length,
      anonymous: sales.value.filter(s => s.sale_type === 'anonymous').length,
      shop: sales.value.filter(s => s.sale_type === 'shop').length
    })

  } catch (error: any) {
    console.error('❌ Error loading sales:', error)
    if (error.code === 'PGRST200') {
      logger.debug('ℹ️ No sales available or database structure differs')
      sales.value = []
    } else {
      alert(`❌ Error loading sales: ${error.message}`)
    }
  } finally {
    isLoading.value = false
  }
}

const openProductSaleModal = () => {
  showProductSaleModal.value = true
}

const openAnonymousSaleModal = () => {
  showAnonymousSaleModal.value = true
}

const closeProductSaleModal = () => {
  showProductSaleModal.value = false
}

const closeAnonymousSaleModal = () => {
  showAnonymousSaleModal.value = false
}

const handleSaleCompleted = () => {
  showProductSaleModal.value = false
  loadSales() // Lade die Verkäufe neu
}

const viewSaleDetails = (sale: ProductSale) => {
  // TODO: Implementiere Verkaufsdetails-Modal
  logger.debug('View sale details:', sale.id)
}

const editSale = (sale: ProductSale) => {
  // TODO: Implementiere Verkaufsbearbeitung
  logger.debug('Edit sale:', sale.id)
}

const duplicateSale = (sale: ProductSale) => {
  // TODO: Implementiere Verkauf duplizieren
  logger.debug('Duplicate sale:', sale.id)
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Abgeschlossen'
    case 'pending':
      return 'Ausstehend'
    case 'cancelled':
      return 'Storniert'
    default:
      return 'Unbekannt'
  }
}

const formatDate = (dateString: string) => {
  // Convert UTC timestamp to local time for display
  // PostgreSQL stores timestamps as UTC, but we want to display them as local time
  const date = new Date(dateString)
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Ungültiges Datum'
  }
  
  // Format as local time (de-CH)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const clearFilters = () => {
  searchTerm.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  selectedStatus.value = ''
  selectedSaleType.value = ''
  selectedTimeframe.value = 'all'
}

const createAnonymousSale = async () => {
  try {
    const supabase = getSupabase()
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    // Bestimme den initialen Status basierend auf der Zahlungsart
    const initialStatus = anonymousPaymentMethod.value === 'cash' ? 'completed' : 'pending'
    
    // Erstelle einen anonymen Verkauf
    const { data: saleData, error: saleError } = await supabase
      .from('product_sales')
      .insert({
        user_id: null, // Kein registrierter Benutzer
        tenant_id: tenantId, // Assign to current tenant
        total_amount_rappen: 0, // Wird später aktualisiert
        status: initialStatus,
        metadata: {
          customer_name: anonymousCustomerName.value || 'Anonymer Kunde',
          notes: anonymousCustomerNotes.value,
          sale_type: 'anonymous',
          payment_method: anonymousPaymentMethod.value,
          created_by: 'staff', // Markiert als Mitarbeiter-Verkauf
          requires_payment: anonymousPaymentMethod.value !== 'cash'
        }
      })
      .select()
      .single()

    if (saleError) throw saleError

    if (anonymousPaymentMethod.value === 'cash') {
      // Bei Barzahlung: Öffne das normale ProductSaleModal für die Produktauswahl
      showAnonymousSaleModal.value = false
      showProductSaleModal.value = true
      
      // Setze die anonymen Kundenfelder zurück
      anonymousCustomerName.value = ''
      anonymousCustomerNotes.value = ''
      anonymousPaymentMethod.value = 'cash'
      
      logger.debug('✅ Anonymer Barverkauf erstellt:', saleData.id)
    } else {
      // Bei Online-Zahlung: Erstelle eine spezielle anonyme Verkaufsseite
      showAnonymousSaleModal.value = false
      
      // Speichere die Verkaufs-ID für die Weiterleitung
      const saleId = saleData.id
      
      // Öffne eine neue Seite für anonyme Verkäufe mit Online-Zahlung
      window.open(`/anonymous-sale/${saleId}`, '_blank')
      
      // Setze die anonymen Kundenfelder zurück
      anonymousCustomerName.value = ''
      anonymousCustomerNotes.value = ''
      anonymousPaymentMethod.value = 'cash'
      
      logger.debug('✅ Anonymer Online-Verkauf erstellt:', saleData.id)
    }
    
  } catch (error: any) {
    console.error('❌ Fehler beim Erstellen des anonymen Verkaufs:', error)
    alert(`Fehler: ${error.message}`)
  }
}

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Product sales page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, loading product sales...')
  
  // Original onMounted logic
  loadSales()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>
