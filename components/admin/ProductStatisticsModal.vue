<!-- components/ProductStatisticsModal.vue -->
<template>
  <!-- Modal Wrapper -->
  <div v-if="show" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="admin-modal bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 flex items-center">
              📊 Produktstatistiken
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              Detaillierte Verkaufsanalyse aller Produkte
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[calc(90vh-80px)]">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"/>
          <p class="text-gray-600">Lade Produktstatistiken...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <span class="text-red-600 mr-2">❌</span>
              <span class="text-red-800">{{ error }}</span>
            </div>
          </div>
        </div>

        <!-- Statistics Content -->
        <div v-else class="p-6 space-y-6">
          
          <!-- Overall Stats Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-blue-700 font-medium">Gesamt-Verkäufe</p>
                  <p class="text-2xl font-bold text-blue-900">{{ overallStats.totalSales }}</p>
                </div>
                <div class="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                  <span class="text-blue-600 text-lg">📦</span>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-green-700 font-medium">Gesamt-Umsatz</p>
                  <p class="text-2xl font-bold text-green-900">CHF {{ overallStats.totalRevenue.toFixed(2) }}</p>
                </div>
                <div class="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                  <span class="text-green-600 text-lg">💰</span>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-purple-700 font-medium">Ø Bestellwert</p>
                  <p class="text-2xl font-bold text-purple-900">CHF {{ overallStats.avgOrderValue.toFixed(2) }}</p>
                </div>
                <div class="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                  <span class="text-purple-600 text-lg">📊</span>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-orange-700 font-medium">Aktive Produkte</p>
                  <p class="text-2xl font-bold text-orange-900">{{ overallStats.activeProducts }}</p>
                </div>
                <div class="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                  <span class="text-orange-600 text-lg">✅</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Top 3 Products -->
          <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
              🏆 Top 3 Bestseller
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                v-for="(product, index) in topProducts.slice(0, 3)" 
                :key="product.product_id"
                class="bg-white rounded-lg p-4 border-2"
                :class="[
                  index === 0 ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100' :
                  index === 1 ? 'border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100' :
                  'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
                ]"
              >
                <div class="text-center">
                  <div class="text-3xl mb-2">
                    {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
                  </div>
                  <h4 class="font-bold text-gray-900 mb-2">{{ product.name }}</h4>
                  <div class="space-y-1 text-sm">
                    <p class="text-gray-700">
                      <span class="font-medium">{{ product.total_quantity }}x</span> verkauft
                    </p>
                    <p class="text-green-600 font-bold">
                      CHF {{ product.total_revenue.toFixed(2) }}
                    </p>
                    <p class="text-gray-500">
                      Ø CHF {{ product.avg_price.toFixed(2) }} pro Stück
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Detailed Product Table -->
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 class="text-lg font-bold text-gray-900 flex items-center">
                📋 Detaillierte Produktstatistiken
              </h3>
            </div>
            
            <!-- Search and Filter -->
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Produkt suchen..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                </div>
                <div>
                  <select
                    v-model="sortBy"
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="total_quantity">Nach Verkäufen</option>
                    <option value="total_revenue">Nach Umsatz</option>
                    <option value="name">Nach Name</option>
                    <option value="avg_price">Nach Durchschnittspreis</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rang
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verkäufe
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Umsatz
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ø Preis
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Anteil
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr 
                    v-for="(product, index) in filteredAndSortedProducts" 
                    :key="product.product_id"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <span 
                          class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                          :class="[
                            index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                          ]"
                        >
                          {{ index + 1 }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span class="text-blue-600 text-sm">
                            {{ product.is_voucher ? '🎁' : '📦' }}
                          </span>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900">
                            {{ product.name }}
                          </div>
                          <div class="text-sm text-gray-500">
                            {{ product.description || 'Keine Beschreibung' }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-bold text-blue-600">
                        {{ product.total_quantity }}x
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-bold text-green-600">
                        CHF {{ product.total_revenue.toFixed(2) }}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">
                        CHF {{ product.avg_price.toFixed(2) }}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        v-if="product.category"
                        class="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"
                      >
                        {{ product.category }}
                      </span>
                      <span v-else class="text-gray-400 text-sm">-</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            class="bg-blue-600 h-2 rounded-full"
                            :style="{ width: `${(product.total_quantity / topProducts[0]?.total_quantity * 100) || 0}%` }"
                          />
                        </div>
                        <span class="text-xs text-gray-500">
                          {{ ((product.total_quantity / overallStats.totalSales) * 100).toFixed(1) }}%
                        </span>
                      </div>
                    </td>
                  </tr>

                  <!-- Empty State -->
                  <tr v-if="filteredAndSortedProducts.length === 0">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                      <div class="text-lg">📊 Keine Produktdaten gefunden</div>
                      <div class="text-sm mt-2">
                        {{ searchQuery ? 'Versuchen Sie eine andere Suche' : 'Noch keine Verkäufe vorhanden' }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Additional Insights -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Category Performance -->
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                🏷️ Performance nach Kategorie
              </h3>
              <div class="space-y-3">
                <div 
                  v-for="category in categoryStats" 
                  :key="category.name"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div class="font-medium text-gray-900">{{ category.name || 'Ohne Kategorie' }}</div>
                    <div class="text-sm text-gray-500">{{ category.products }} Produkte</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-green-600">CHF {{ category.revenue.toFixed(2) }}</div>
                    <div class="text-sm text-gray-500">{{ category.quantity }}x verkauft</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Facts -->
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                💡 Interessante Fakten
              </h3>
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <span class="text-blue-600 text-lg">🎯</span>
                  <div>
                    <div class="font-medium text-gray-900">Conversion Rate</div>
                    <div class="text-sm text-gray-600">
                      {{ ((overallStats.totalSales / overallStats.activeProducts) || 0).toFixed(1) }} Verkäufe pro Produkt im Schnitt
                    </div>
                  </div>
                </div>
                
                <div class="flex items-start gap-3">
                  <span class="text-green-600 text-lg">💎</span>
                  <div>
                    <div class="font-medium text-gray-900">Wertvollstes Produkt</div>
                    <div class="text-sm text-gray-600">
                      {{ topByRevenue?.name || 'N/A' }} (CHF {{ topByRevenue?.total_revenue.toFixed(2) || '0.00' }})
                    </div>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <span class="text-purple-600 text-lg">⚡</span>
                  <div>
                    <div class="font-medium text-gray-900">Populärstes Produkt</div>
                    <div class="text-sm text-gray-600">
                      {{ topByQuantity?.name || 'N/A' }} ({{ topByQuantity?.total_quantity || 0 }}x verkauft)
                    </div>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <span class="text-orange-600 text-lg">🎁</span>
                  <div>
                    <div class="font-medium text-gray-900">Gutschein-Umsatz</div>
                    <div class="text-sm text-gray-600">
                      CHF {{ voucherStats.revenue.toFixed(2) }} ({{ voucherStats.quantity }}x verkauft)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
interface Props {
  show: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'close': []
}>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const productStats = ref<any[]>([])
const searchQuery = ref('')
const sortBy = ref('total_quantity')

// Computed
const overallStats = computed(() => {
  const totalSales = productStats.value.reduce((sum, p) => sum + p.total_quantity, 0)
  const totalRevenue = productStats.value.reduce((sum, p) => sum + p.total_revenue, 0)
  const activeProducts = productStats.value.length
  
  return {
    totalSales,
    totalRevenue,
    avgOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    activeProducts
  }
})

const topProducts = computed(() => {
  return [...productStats.value]
    .sort((a, b) => b.total_quantity - a.total_quantity)
})

const topByRevenue = computed(() => {
  return [...productStats.value]
    .sort((a, b) => b.total_revenue - a.total_revenue)[0]
})

const topByQuantity = computed(() => {
  return topProducts.value[0]
})

const voucherStats = computed(() => {
  const vouchers = productStats.value.filter(p => p.is_voucher)
  return {
    quantity: vouchers.reduce((sum, p) => sum + p.total_quantity, 0),
    revenue: vouchers.reduce((sum, p) => sum + p.total_revenue, 0)
  }
})

const categoryStats = computed(() => {
  const categories = new Map<string, { products: number; quantity: number; revenue: number }>()
  
  productStats.value.forEach(product => {
    const category = product.category || 'Ohne Kategorie'
    if (!categories.has(category)) {
      categories.set(category, { products: 0, quantity: 0, revenue: 0 })
    }
    const cat = categories.get(category)!
    cat.products += 1
    cat.quantity += product.total_quantity
    cat.revenue += product.total_revenue
  })
  
  return Array.from(categories.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
})

const filteredAndSortedProducts = computed(() => {
  let filtered = productStats.value
  
  // Search filter
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase()
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search)
    )
  }
  
  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'total_revenue':
        return b.total_revenue - a.total_revenue
      case 'avg_price':
        return b.avg_price - a.avg_price
      default: // total_quantity
        return b.total_quantity - a.total_quantity
    }
  })
  
  return filtered
})

// Methods
const loadStatistics = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const supabase = getSupabase()
    
    // Lade alle Verkaufsdaten mit Produktinformationen
    const { data, error: dbError } = await supabase
      .from('appointment_products')
      .select(`
        product_id,
        quantity,
        unit_price_rappen,
        total_price_rappen,
        products!inner (
          name,
          description,
          category,
          is_voucher
        )
      `)
    
    if (dbError) throw dbError
    
    // Gruppiere und berechne Statistiken pro Produkt
    const productMap = new Map<string, any>()
    
    data?.forEach((sale: any) => {
      const productId = sale.product_id
      const product = sale.products
      
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          name: product.name,
          description: product.description,
          category: product.category,
          is_voucher: product.is_voucher,
          total_quantity: 0,
          total_revenue: 0,
          sales_count: 0,
          prices: []
        })
      }
      
      const stats = productMap.get(productId)!
      stats.total_quantity += sale.quantity
      stats.total_revenue += sale.total_price_rappen / 100 // Convert to CHF
      stats.sales_count += 1
      stats.prices.push(sale.unit_price_rappen / 100)
    })
    
    // Berechne Durchschnittspreise
    productStats.value = Array.from(productMap.values()).map(product => ({
      ...product,
      avg_price: product.prices.length > 0 
        ? product.prices.reduce((sum: number, price: number) => sum + price, 0) / product.prices.length 
        : 0
    })).filter(product => product.total_quantity > 0) // Nur Produkte mit Verkäufen
    
    logger.debug('✅ Product statistics loaded:', productStats.value.length)
    
  } catch (err: any) {
    console.error('❌ Error loading product statistics:', err)
    error.value = `Fehler beim Laden der Statistiken: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

// Watch for modal opening
watch(() => props.show, (newValue) => {
  if (newValue) {
    loadStatistics()
  }
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

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Focus states */
input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Hover effects */
tbody tr:hover {
  background-color: #f9fafb;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
</style>