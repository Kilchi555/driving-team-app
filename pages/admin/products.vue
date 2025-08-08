<!-- pages/admin/products.vue -->
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            📦 Produktverwaltung
          </h1>
          <p class="text-gray-600">
            Verwalten Sie alle verfügbaren Produkte für Ihre Kunden
          </p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
        >
          ➕ Neues Produkt
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Alle Produkte</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalProducts }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">📦</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Aktive Produkte</p>
            <p class="text-2xl font-bold text-green-600">{{ activeProducts }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">✅</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Kategorien</p>
            <p class="text-2xl font-bold text-purple-600">{{ categoriesCount }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">🏷️</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow" @click="showStatisticsModal = true">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Meistverkauft</p>
            <p class="text-lg font-bold text-orange-600">{{ topSellingProduct.name || 'Noch keine Verkäufe' }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">🏆</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          {{ topSellingProduct.quantity ? `${topSellingProduct.quantity}x verkauft` : 'Keine Daten' }}
          <span class="text-blue-600 ml-2">→ Klicken für Details</span>
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Produktname suchen..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
          <select
            v-model="selectedCategory"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Kategorien</option>
            <option v-for="category in uniqueCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produkt
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preis
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lager
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div v-if="product.image_url" class="flex-shrink-0 h-12 w-12 mr-4">
                    <img :src="product.image_url" :alt="product.name" class="h-12 w-12 rounded object-cover">
                  </div>
                  <div v-else class="flex-shrink-0 h-12 w-12 mr-4 bg-gray-200 rounded flex items-center justify-center">
                    <span class="text-gray-500 text-lg">{{ product.is_voucher ? '🎁' : '📦' }}</span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900 flex items-center">
                      {{ product.name }}
                      <span v-if="product.is_voucher" class="ml-2 inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        🎁 Gutschein
                      </span>
                    </div>
                    <div class="text-sm text-gray-500">{{ product.description }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span v-if="product.category" class="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                  {{ product.category }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">
                  CHF {{ (product.price_rappen / 100).toFixed(2) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  :class="product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ product.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  <span v-if="product.track_stock">
                    {{ product.stock_quantity || 0 }} Stk.
                  </span>
                  <span v-else class="text-gray-400">Kein Tracking</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex space-x-2">
                  <button
                    @click="editProduct(product)"
                    class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    ✏️ Bearbeiten
                  </button>
                  <button
                    @click="toggleProductStatus(product)"
                    :class="product.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'"
                    class="text-sm font-medium"
                  >
                    {{ product.is_active ? 'Deaktivieren' : 'Aktivieren' }}
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredProducts.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="text-lg">📦 Keine Produkte gefunden</div>
                <div class="text-sm mt-2">
                  {{ searchTerm || selectedCategory || selectedStatus ? 'Versuchen Sie eine andere Suche' : 'Erstellen Sie das erste Produkt' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingProduct ? '✏️ Produkt bearbeiten' : '➕ Neues Produkt erstellen' }}
            </h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Form -->
        <div class="px-6 py-4 space-y-6">
          
          <!-- Gutschein-Toggle GANZ OBEN -->
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-blue-800">
                  🎁 Dies ist ein Gutschein
                </label>
                <p class="text-xs text-blue-600 mt-1">
                  Gutscheine können mit festem oder individuellem Betrag erstellt werden
                </p>
              </div>
              <!-- Toggle Switch -->
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="formData.is_voucher"
                  class="sr-only peer"
                >
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Individueller Betrag Toggle (nur wenn Gutschein aktiviert) -->
            <div v-if="formData.is_voucher" class="mt-4 pt-4 border-t border-blue-200">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-blue-800">
                    💰 Individueller Betrag erlaubt
                  </label>
                  <p class="text-xs text-blue-600 mt-1">
                    Kunden können den Gutschein-Betrag selbst bestimmen (1-1000 CHF)
                  </p>
                </div>
                <!-- Toggle Switch -->
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="formData.allow_custom_amount"
                    class="sr-only peer"
                  >
                  <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Produktname *
            </label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Nothelferkurs Buch"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kurze Beschreibung des Produkts..."
            ></textarea>
          </div>

          <!-- Price (versteckt wenn individueller Betrag aktiviert) -->
          <div v-if="!formData.allow_custom_amount">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ formData.is_voucher ? 'Standard-Betrag (CHF) *' : 'Preis (CHF) *' }}
            </label>
            <input
              v-model.number="formData.price"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :placeholder="formData.is_voucher ? '100.00' : '0.00'"
            />
            <p v-if="formData.is_voucher" class="text-xs text-blue-600 mt-1">
              Dieser Betrag wird als Vorschlag angezeigt
            </p>
          </div>

          <!-- Info wenn kein Preis nötig -->
          <div v-if="formData.allow_custom_amount" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-center">
              <span class="text-yellow-600 mr-2">ℹ️</span>
              <span class="text-sm text-yellow-800">
                Preis wird individuell vom Kunden bestimmt (kein fester Betrag nötig)
              </span>
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
            </label>
            <input
              v-model="formData.category"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Bücher, Ausrüstung, Kurse"
            />
          </div>

          <!-- Stock Management -->
          <div class="space-y-4">
            <div class="flex items-center">
              <input
                v-model="formData.track_stock"
                type="checkbox"
                id="track_stock"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="track_stock" class="ml-2 text-sm text-gray-700">
                Lagerbestand verfolgen
              </label>
            </div>

            <div v-if="formData.track_stock">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Lagerbestand
              </label>
              <input
                v-model.number="formData.stock_quantity"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Image URL -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Bild URL (optional)
            </label>
            <input
              v-model="formData.image_url"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/bild.jpg"
            />
            <div v-if="formData.image_url" class="mt-2">
              <img :src="formData.image_url" alt="Vorschau" class="h-20 w-20 object-cover rounded">
            </div>
          </div>

          <!-- Display Order -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Anzeigereihenfolge
            </label>
            <input
              v-model.number="formData.display_order"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <p class="text-xs text-gray-500 mt-1">Niedrigere Zahlen werden zuerst angezeigt</p>
          </div>

          <!-- Active Status -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label class="text-sm font-medium text-gray-700">
                Produkt ist aktiv und sichtbar
              </label>
              <p class="text-xs text-gray-500 mt-1">
                Nur aktive Produkte werden in der Produktauswahl angezeigt
              </p>
            </div>
            <!-- Toggle Switch -->
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="formData.is_active"
                class="sr-only peer"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="saveProduct"
            :disabled="!isFormValid"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ editingProduct ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Product Statistics Modal -->
    <ProductStatisticsModal 
      :show="showStatisticsModal" 
      @close="showStatisticsModal = false" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta } from '#imports'
import { getSupabase } from '~/utils/supabase'
import ProductStatisticsModal from '~/components/admin/ProductStatisticsModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

// Types
interface Product {
  id: string
  name: string
  description?: string
  price_rappen: number
  category?: string
  is_active: boolean
  stock_quantity?: number
  track_stock: boolean
  image_url?: string
  display_order: number
  created_at: string
  is_voucher?: boolean
  allow_custom_amount?: boolean
}

// State
const products = ref<Product[]>([])
const isLoading = ref(false)
const showModal = ref(false)
const showStatisticsModal = ref(false)
const editingProduct = ref<Product | null>(null)
const searchTerm = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const topSellingProduct = ref<{ name: string; quantity: number }>({ name: '', quantity: 0 })

// Form data
const formData = ref({
  name: '',
  description: '',
  price: 0,
  category: '',
  track_stock: false,
  stock_quantity: 0,
  image_url: '',
  display_order: 0,
  is_active: true,
  is_voucher: false,
  allow_custom_amount: false
})

// Computed
const filteredProducts = computed(() => {
  let filtered = products.value

  // Search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search)
    )
  }

  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter(product => product.category === selectedCategory.value)
  }

  // Status filter
  if (selectedStatus.value) {
    const isActive = selectedStatus.value === 'active'
    filtered = filtered.filter(product => product.is_active === isActive)
  }

  return filtered
})

const uniqueCategories = computed(() => {
  const categories = products.value
    .map(p => p.category)
    .filter(c => c && c.trim() !== '')
  return [...new Set(categories)].sort()
})

const totalProducts = computed(() => products.value.length)
const activeProducts = computed(() => products.value.filter(p => p.is_active).length)
const categoriesCount = computed(() => uniqueCategories.value.length)

const isFormValid = computed(() => {
  // Wenn individueller Betrag erlaubt ist, brauchen wir keinen Preis
  if (formData.value.allow_custom_amount) {
    return formData.value.name.trim() !== ''
  }
  // Sonst brauchen wir Name und Preis
  return formData.value.name.trim() !== '' && formData.value.price > 0
})

// Methods
const loadProducts = async () => {
  isLoading.value = true
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    products.value = data || []
    console.log('✅ Products loaded:', products.value.length)

    // Lade zusätzlich die Verkaufsstatistiken
    await loadTopSellingProduct()

  } catch (error: any) {
    console.error('❌ Error loading products:', error)
    alert(`❌ Fehler beim Laden der Produkte: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

const loadTopSellingProduct = async () => {
  try {
    const supabase = getSupabase()
    
    // Query für meistverkauftes Produkt
    const { data, error } = await supabase
      .from('appointment_products')
      .select(`
        product_id,
        quantity,
        products!inner (
          name
        )
      `)
    
    if (error) throw error
    
    // Gruppiere nach Produkt und summiere Mengen
    const productSales = new Map<string, { name: string; quantity: number }>()
    
    data?.forEach((item: any) => {
      const productId = item.product_id
      const productName = item.products?.name || 'Unbekannt'
      const quantity = item.quantity || 0
      
      if (productSales.has(productId)) {
        productSales.get(productId)!.quantity += quantity
      } else {
        productSales.set(productId, { name: productName, quantity })
      }
    })
    
    // Finde das meistverkaufte
    let topProduct = { name: '', quantity: 0 }
    for (const [, product] of productSales) {
      if (product.quantity > topProduct.quantity) {
        topProduct = product
      }
    }
    
    topSellingProduct.value = topProduct
    console.log('🏆 Top selling product:', topProduct)
    
  } catch (error: any) {
    console.error('❌ Error loading top selling product:', error)
    // Fallback
    topSellingProduct.value = { name: '', quantity: 0 }
  }
}

const openCreateModal = () => {
  editingProduct.value = null
  formData.value = {
    name: '',
    description: '',
    price: 0,
    category: '',
    track_stock: false,
    stock_quantity: 0,
    image_url: '',
    display_order: products.value.length,
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false
  }
  showModal.value = true
}

const editProduct = (product: Product) => {
  editingProduct.value = product
  formData.value = {
    name: product.name,
    description: product.description || '',
    price: product.price_rappen / 100,
    category: product.category || '',
    track_stock: product.track_stock,
    stock_quantity: product.stock_quantity || 0,
    image_url: product.image_url || '',
    display_order: product.display_order,
    is_active: product.is_active,
    is_voucher: product.is_voucher || false,
    allow_custom_amount: product.allow_custom_amount || false
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingProduct.value = null
}

const saveProduct = async () => {
  if (!isFormValid.value) return

  try {
    const supabase = getSupabase()
    
    const productData = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim() || null,
      price_rappen: formData.value.allow_custom_amount ? 0 : Math.round(formData.value.price * 100),
      category: formData.value.category.trim() || null,
      track_stock: formData.value.track_stock,
      stock_quantity: formData.value.track_stock ? formData.value.stock_quantity : null,
      image_url: formData.value.image_url.trim() || null,
      display_order: formData.value.display_order,
      is_active: formData.value.is_active,
      is_voucher: formData.value.is_voucher,
      allow_custom_amount: formData.value.is_voucher ? formData.value.allow_custom_amount : false
    }

    if (editingProduct.value) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.value.id)

      if (error) throw error

      console.log('✅ Product updated:', editingProduct.value.id)
      alert('✅ Produkt erfolgreich aktualisiert!')

    } else {
      // Create new product
      const { error } = await supabase
        .from('products')
        .insert([productData])

      if (error) throw error

      console.log('✅ Product created')
      alert('✅ Produkt erfolgreich erstellt!')
    }

    closeModal()
    await loadProducts()

  } catch (error: any) {
    console.error('❌ Error saving product:', error)
    alert(`❌ Fehler beim Speichern: ${error.message}`)
  }
}

const toggleProductStatus = async (product: Product) => {
  try {
    const supabase = getSupabase()
    const newStatus = !product.is_active
    
    const { error } = await supabase
      .from('products')
      .update({ is_active: newStatus })
      .eq('id', product.id)

    if (error) throw error

    // Update local state
    product.is_active = newStatus
    
    const status = newStatus ? 'aktiviert' : 'deaktiviert'
    console.log(`✅ Product ${status}:`, product.name)
    alert(`✅ ${product.name} wurde ${status}`)

  } catch (error: any) {
    console.error('❌ Error toggling product status:', error)
    alert(`❌ Fehler: ${error.message}`)
  }
}

// Lifecycle
onMounted(() => {
  loadProducts()
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

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>