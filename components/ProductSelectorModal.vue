<!-- components/ProductSelectorModal.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-xl">
      
      <!-- Header -->
      <div class="bg-blue-600 text-white p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            <h3 class="text-xl font-semibold">Produkte auswählen</h3>
          </div>
          <button @click="$emit('close')" class="text-white hover:text-blue-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="p-6 border-b bg-gray-50">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Produkte durchsuchen..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- Filter by Category -->
          <div class="w-full md:w-48">
            <select
              v-model="selectedCategory"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Alle Kategorien</option>
              <option value="lessons">Fahrlektionen</option>
              <option value="packages">Pakete</option>
              <option value="vouchers">Gutscheine</option>
              <option value="materials">Materialien</option>
              <option value="services">Services</option>
            </select>
          </div>
          
          <!-- Filter by Type -->
          <div class="w-full md:w-48">
            <select
              v-model="selectedType"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Alle Typen</option>
              <option value="regular">Reguläre Produkte</option>
              <option value="voucher">Gutscheine</option>
              <option value="custom">Individuelle Beträge</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[calc(95vh-200px)] p-6">
        
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Produkte werden geladen...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-red-800 text-sm">{{ error }}</span>
          </div>
        </div>

        <!-- Products Grid -->
        <div v-else-if="filteredProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <!-- Product Header -->
            <div class="mb-3">
              <h4 class="font-semibold text-gray-900 text-lg">{{ product.name }}</h4>
              <p class="text-sm text-gray-600">{{ product.description }}</p>
            </div>

            <!-- Product Details -->
            <div class="space-y-2 text-sm mb-4">
              <!-- Category -->
              <div class="flex justify-between">
                <span class="text-gray-600">Kategorie:</span>
                <span class="font-medium text-gray-900">{{ getCategoryLabel(product.category || 'unknown') }}</span>
              </div>

              <!-- Price -->
              <div class="flex justify-between">
                <span class="text-gray-600">Preis:</span>
                <span class="font-medium text-blue-600 text-lg">
                  CHF {{ (product.price_rappen / 100).toFixed(2) }}
                </span>
              </div>

              <!-- Voucher Info -->
              <div v-if="product.is_voucher" class="flex justify-between">
                <span class="text-gray-600">Typ:</span>
                <span class="font-medium text-purple-600">Gutschein</span>
              </div>

              <!-- Custom Amount Info -->
              <div v-if="product.allow_custom_amount" class="flex justify-between">
                <span class="text-gray-600">Individueller Betrag:</span>
                <span class="font-medium text-green-600">Ja</span>
              </div>
            </div>

            <!-- Quantity and Custom Amount -->
            <div class="space-y-3">
              <!-- Quantity Selector -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Menge:</span>
                <div class="flex items-center space-x-2">
                  <button
                    @click="decreaseQuantity(product.id)"
                    :disabled="getProductQuantity(product.id) <= 1"
                    class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                  </button>
                  <span class="w-12 text-center font-medium">{{ getProductQuantity(product.id) }}</span>
                  <button
                    @click="increaseQuantity(product.id)"
                    class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Custom Amount Input (for vouchers) -->
              <div v-if="product.allow_custom_amount" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">
                  Gutschein-Betrag (CHF)
                </label>
                <div class="relative">
                  <input
                    :value="getProductCustomAmount(product.id)"
                    type="number"
                    step="0.01"
                    min="1"
                    max="1000"
                    placeholder="z.B. 100.00"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    @input="updateProductCustomAmount(product.id, $event)"
                  />
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span class="text-gray-500">CHF</span>
                  </div>
                </div>
                <div class="text-xs text-gray-500">
                  Min: CHF {{ (product.min_amount_rappen / 100).toFixed(2) }}, 
                  Max: CHF {{ ((product.max_amount_rappen || product.min_amount_rappen) / 100).toFixed(2) }}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-4 flex space-x-2">
              <button
                v-if="!isProductSelected(product.id)"
                @click="addProduct(product)"
                class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <i class="fas fa-plus mr-2"></i>
                Hinzufügen
              </button>
              <button
                v-else
                @click="removeProduct(product.id)"
                class="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <i class="fas fa-minus mr-2"></i>
                Entfernen
              </button>
            </div>

            <!-- Status Badge -->
            <div class="mt-3 pt-3 border-t border-gray-200">
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-800': product.is_active,
                  'bg-red-100 text-red-800': !product.is_active
                }"
              >
                {{ product.is_active ? 'Verfügbar' : 'Nicht verfügbar' }}
              </span>
            </div>
          </div>
        </div>

        <!-- No Products Message -->
        <div v-else class="text-center py-8 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <p class="text-lg font-medium text-gray-900 mb-2">Keine Produkte gefunden</p>
          <p class="text-gray-600">Versuchen Sie andere Suchkriterien oder Filter</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t bg-gray-50 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          {{ selectedProducts.size }} Produkt(e) ausgewählt
        </div>
        
        <div class="flex space-x-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          
          <button
            @click="confirmSelection"
            :disabled="selectedProducts.size === 0"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ selectedProducts.size === 0 ? 'Keine ausgewählt' : `${selectedProducts.size} Produkt(e) bestätigen` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Product } from '~/types/payment'

// Props
interface Props {
  initialProducts?: Product[]
}

const props = withDefaults(defineProps<Props>(), {
  initialProducts: () => []
})

// Emits
const emit = defineEmits<{
  'products-selected': [products: Product[]]
  'close': []
}>()

// Reactive State
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedType = ref('')
const selectedProducts = ref<Map<string, { product: Product; quantity: number; customAmount?: number }>>(new Map())

// Mock data for demonstration
const availableProducts = ref<Product[]>([
  {
    id: '1',
    name: 'Fahrlektion 45 Min',
    price_rappen: 12000, // CHF 120.00
    description: 'Einzelne Fahrlektion mit 45 Minuten Dauer',
    category: 'lessons',
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false,
    min_amount_rappen: 0,
    max_amount_rappen: 0,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Fahrlektion 90 Min',
    price_rappen: 22000, // CHF 220.00
    description: 'Einzelne Fahrlektion mit 90 Minuten Dauer',
    category: 'lessons',
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false,
    min_amount_rappen: 0,
    max_amount_rappen: 0,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: '10er Paket Fahrlektionen',
    price_rappen: 100000, // CHF 1'000.00
    description: 'Paket mit 10 Fahrlektionen à 45 Minuten',
    category: 'packages',
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false,
    min_amount_rappen: 0,
    max_amount_rappen: 0,
    display_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Gutschein individuell',
    price_rappen: 0, // Wird durch custom amount bestimmt
    description: 'Gutschein mit individuellem Betrag',
    category: 'vouchers',
    is_active: true,
    is_voucher: true,
    allow_custom_amount: true,
    min_amount_rappen: 1000, // CHF 10.00
    max_amount_rappen: 100000, // CHF 1'000.00
    display_order: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'Theoriebuch',
    price_rappen: 3500, // CHF 35.00
    description: 'Offizielles Theoriebuch für die Fahrprüfung',
    category: 'materials',
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false,
    min_amount_rappen: 0,
    max_amount_rappen: 0,
    display_order: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    name: 'Prüfungssimulation',
    price_rappen: 2500, // CHF 25.00
    description: 'Online-Prüfungssimulation mit 100 Fragen',
    category: 'services',
    is_active: true,
    is_voucher: false,
    allow_custom_amount: false,
    min_amount_rappen: 0,
    max_amount_rappen: 0,
    display_order: 6,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
])

// Computed
const filteredProducts = computed(() => {
  let products = availableProducts.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    products = products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query))
    )
  }

  // Filter by category
  if (selectedCategory.value) {
    products = products.filter(product => product.category === selectedCategory.value)
  }

  // Filter by type
  if (selectedType.value) {
    if (selectedType.value === 'voucher') {
      products = products.filter(product => product.is_voucher)
    } else if (selectedType.value === 'custom') {
      products = products.filter(product => product.allow_custom_amount)
    } else if (selectedType.value === 'regular') {
      products = products.filter(product => !product.is_voucher && !product.allow_custom_amount)
    }
  }

  // Only show active products
  products = products.filter(product => product.is_active)

  return products
})

// Methods
const addProduct = (product: Product) => {
  const existing = selectedProducts.value.get(product.id)
  if (existing) {
    existing.quantity += 1
  } else {
    selectedProducts.value.set(product.id, {
      product,
      quantity: 1,
      customAmount: product.allow_custom_amount ? product.min_amount_rappen : undefined
    })
  }
}

const removeProduct = (productId: string) => {
  selectedProducts.value.delete(productId)
}

const isProductSelected = (productId: string): boolean => {
  return selectedProducts.value.has(productId)
}

const getProductQuantity = (productId: string): number => {
  const selected = selectedProducts.value.get(productId)
  return selected ? selected.quantity : 0
}

const getProductCustomAmount = (productId: string): number => {
  const selected = selectedProducts.value.get(productId)
  if (selected && selected.customAmount !== undefined) {
    return selected.customAmount / 100 // Convert from rappen to CHF
  }
  return 0
}

const increaseQuantity = (productId: string) => {
  const selected = selectedProducts.value.get(productId)
  if (selected) {
    selected.quantity += 1
  }
}

const decreaseQuantity = (productId: string) => {
  const selected = selectedProducts.value.get(productId)
  if (selected && selected.quantity > 1) {
    selected.quantity -= 1
  }
}

const updateProductCustomAmount = (productId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  const amount = parseFloat(target.value) * 100 // Convert from CHF to rappen
  
  const selected = selectedProducts.value.get(productId)
  if (selected) {
    selected.customAmount = amount
  }
}

const confirmSelection = () => {
  const productsWithDetails = Array.from(selectedProducts.value.values()).map(({ product, quantity, customAmount }) => {
    const finalPrice = product.allow_custom_amount && customAmount ? customAmount : product.price_rappen
    return {
      ...product,
      quantity,
      unit_price_rappen: finalPrice,
      total_price_rappen: finalPrice * quantity
    }
  })
  
  emit('products-selected', productsWithDetails)
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    lessons: 'Fahrlektionen',
    packages: 'Pakete',
    vouchers: 'Gutscheine',
    materials: 'Materialien',
    services: 'Services'
  }
  return labels[category] || category
}

// Initialize with initial products
onMounted(() => {
  props.initialProducts.forEach(product => {
    selectedProducts.value.set(product.id, {
      product,
      quantity: 1,
      customAmount: product.price_rappen
    })
  })
})
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
