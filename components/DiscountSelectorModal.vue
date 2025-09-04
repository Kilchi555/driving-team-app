<!-- components/DiscountSelectorModal.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-xl">
      
      <!-- Header -->
      <div class="bg-green-600 text-white p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-xl font-semibold">Rabatte auswählen</h3>
          </div>
          <button @click="$emit('close')" class="text-white hover:text-green-200 transition-colors">
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
              placeholder="Rabatte durchsuchen..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <!-- Filter by Type -->
          <div class="w-full md:w-48">
            <select
              v-model="selectedType"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Alle Typen</option>
              <option value="percentage">Prozentual</option>
              <option value="fixed">Fester Betrag</option>
              <option value="free_lesson">Kostenlose Lektion</option>
              <option value="free_product">Kostenloses Produkt</option>
            </select>
          </div>
          
          <!-- Filter by Category -->
          <div class="w-full md:w-48">
            <select
              v-model="selectedCategory"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Alle Kategorien</option>
              <option value="all">Alle</option>
              <option value="appointments">Nur Termine</option>
              <option value="products">Nur Produkte</option>
              <option value="services">Nur Services</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[calc(95vh-200px)] p-6">
        
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span class="ml-2 text-gray-600">Rabatte werden geladen...</span>
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

        <!-- Discounts Grid -->
        <div v-else-if="filteredDiscounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="discount in filteredDiscounts"
            :key="discount.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            :class="{
              'ring-2 ring-green-500 bg-green-50': isDiscountSelected(discount.id),
              'bg-white': !isDiscountSelected(discount.id)
            }"
            @click="toggleDiscountSelection(discount)"
          >
            <!-- Discount Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h4 class="font-semibold text-gray-900">{{ discount.name }}</h4>
                <p class="text-sm text-gray-600">{{ discount.description }}</p>
              </div>
              <div class="ml-2">
                <input
                  type="checkbox"
                  :checked="isDiscountSelected(discount.id)"
                  @change="toggleDiscountSelection(discount)"
                  class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
              </div>
            </div>

            <!-- Discount Details -->
            <div class="space-y-2 text-sm">
              <!-- Discount Value -->
              <div class="flex justify-between">
                <span class="text-gray-600">Rabatt:</span>
                <span class="font-medium text-green-600">
                  <span v-if="discount.discount_type === 'percentage'">{{ discount.discount_value }}%</span>
                  <span v-else-if="discount.discount_type === 'fixed'">CHF {{ (discount.discount_value / 100).toFixed(2) }}</span>
                  <span v-else>{{ getDiscountTypeLabel(discount.discount_type) }}</span>
                </span>
              </div>

              <!-- Applies To -->
              <div class="flex justify-between">
                <span class="text-gray-600">Gilt für:</span>
                <span class="font-medium text-gray-900">{{ getAppliesToLabel(discount.applies_to) }}</span>
              </div>

              <!-- Validity -->
              <div class="flex justify-between">
                <span class="text-gray-600">Gültig bis:</span>
                <span class="font-medium text-gray-900">{{ formatDate(discount.valid_until) }}</span>
              </div>

              <!-- Usage Limit -->
              <div v-if="discount.usage_limit" class="flex justify-between">
                <span class="text-gray-600">Verwendungen:</span>
                <span class="font-medium text-gray-900">{{ discount.usage_count }} / {{ discount.usage_limit }}</span>
              </div>

              <!-- Min Amount -->
              <div v-if="discount.min_amount_rappen > 0" class="flex justify-between">
                <span class="text-gray-600">Min. Betrag:</span>
                <span class="font-medium text-gray-900">CHF {{ (discount.min_amount_rappen / 100).toFixed(2) }}</span>
              </div>

              <!-- Max Discount -->
              <div v-if="discount.max_discount_rappen > 0" class="flex justify-between">
                <span class="text-gray-600">Max. Rabatt:</span>
                <span class="font-medium text-gray-900">CHF {{ (discount.max_discount_rappen / 100).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="mt-3 pt-3 border-t border-gray-200">
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-800': discount.is_active,
                  'bg-red-100 text-red-800': !discount.is_active
                }"
              >
                {{ discount.is_active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </div>
          </div>
        </div>

        <!-- No Discounts Message -->
        <div v-else class="text-center py-8 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-medium text-gray-900 mb-2">Keine Rabatte gefunden</p>
          <p class="text-gray-600">Versuchen Sie andere Suchkriterien oder Filter</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t bg-gray-50 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          {{ selectedDiscounts.size }} Rabatt(e) ausgewählt
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
            :disabled="selectedDiscounts.size === 0"
            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ selectedDiscounts.size === 0 ? 'Keine ausgewählt' : `${selectedDiscounts.size} Rabatt(e) anwenden` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Discount } from '~/types/payment'

// Props
interface Props {
  initialDiscounts?: Discount[]
}

const props = withDefaults(defineProps<Props>(), {
  initialDiscounts: () => []
})

// Emits
const emit = defineEmits<{
  'discounts-selected': [discounts: Discount[]]
  'close': []
}>()

// Reactive State
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const selectedType = ref('')
const selectedCategory = ref('')
const selectedDiscounts = ref<Map<string, Discount>>(new Map())

// Mock data for demonstration
const availableDiscounts = ref<Discount[]>([
  {
    id: '1',
    name: 'Neukunden-Rabatt',
    code: 'NEU10',
    discount_type: 'percentage',
    discount_value: 10,
    discount_amount_rappen: 0, // Will be calculated
    min_amount_rappen: 5000, // CHF 50.00
    max_discount_rappen: 2000, // CHF 20.00
    valid_from: '2024-01-01',
    valid_until: '2024-12-31',
    usage_limit: 100,
    usage_count: 45,
    is_active: true,
    applies_to: 'all',
    category_filter: null,
    staff_id: null,
    description: '10% Rabatt für neue Kunden',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Fruehling-Special',
    code: 'FRUEHLING20',
    discount_type: 'fixed',
    discount_value: 2000, // CHF 20.00
    discount_amount_rappen: 2000,
    min_amount_rappen: 10000, // CHF 100.00
    max_discount_rappen: 2000,
    valid_from: '2024-03-01',
    valid_until: '2024-05-31',
    usage_limit: 50,
    usage_count: 12,
    is_active: true,
    applies_to: 'appointments',
    category_filter: null,
    staff_id: null,
    description: 'CHF 20.00 Rabatt auf alle Fahrlektionen',
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Paket-Rabatt',
    code: 'PAKET15',
    discount_type: 'percentage',
    discount_value: 15,
    discount_amount_rappen: 0,
    min_amount_rappen: 20000, // CHF 200.00
    max_discount_rappen: 5000, // CHF 50.00
    valid_from: '2024-01-01',
    valid_until: '2024-12-31',
    usage_limit: null,
    usage_count: 23,
    is_active: true,
    applies_to: 'products',
    category_filter: 'packages',
    staff_id: null,
    description: '15% Rabatt auf alle Pakete',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Geburtstags-Geschenk',
    code: 'GEBURTSTAG',
    discount_type: 'free_lesson',
    discount_value: 0,
    discount_amount_rappen: 0,
    min_amount_rappen: 0,
    max_discount_rappen: 0,
    valid_from: '2024-01-01',
    valid_until: '2024-12-31',
    usage_limit: 1,
    usage_count: 0,
    is_active: true,
    applies_to: 'appointments',
    category_filter: null,
    staff_id: null,
    description: 'Eine kostenlose Fahrlektion zum Geburtstag',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
])

// Computed
const filteredDiscounts = computed(() => {
  let discounts = availableDiscounts.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    discounts = discounts.filter(discount => 
      discount.name.toLowerCase().includes(query) ||
      discount.description.toLowerCase().includes(query) ||
      discount.code.toLowerCase().includes(query)
    )
  }

  // Filter by type
  if (selectedType.value) {
    discounts = discounts.filter(discount => discount.discount_type === selectedType.value)
  }

  // Filter by category
  if (selectedCategory.value) {
    discounts = discounts.filter(discount => discount.applies_to === selectedCategory.value)
  }

  // Only show active discounts
  discounts = discounts.filter(discount => discount.is_active)

  // Only show discounts that haven't reached their usage limit
  discounts = discounts.filter(discount => 
    !discount.usage_limit || discount.usage_count < discount.usage_limit
  )

  return discounts
})

// Methods
const toggleDiscountSelection = (discount: Discount) => {
  if (selectedDiscounts.value.has(discount.id)) {
    selectedDiscounts.value.delete(discount.id)
  } else {
    selectedDiscounts.value.set(discount.id, discount)
  }
}

const isDiscountSelected = (discountId: string): boolean => {
  return selectedDiscounts.value.has(discountId)
}

const confirmSelection = () => {
  const selectedDiscountsList = Array.from(selectedDiscounts.value.values())
  emit('discounts-selected', selectedDiscountsList)
}

const getDiscountTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    percentage: 'Prozentual',
    fixed: 'Fester Betrag',
    free_lesson: 'Kostenlose Lektion',
    free_product: 'Kostenloses Produkt'
  }
  return labels[type] || type
}

const getAppliesToLabel = (appliesTo: string): string => {
  const labels: Record<string, string> = {
    all: 'Alle',
    appointments: 'Termine',
    products: 'Produkte',
    services: 'Services'
  }
  return labels[appliesTo] || appliesTo
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

// Initialize with initial discounts
onMounted(() => {
  props.initialDiscounts.forEach(discount => {
    selectedDiscounts.value.set(discount.id, discount)
  })
})
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>
