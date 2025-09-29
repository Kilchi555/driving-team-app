<!-- pages/admin/discounts.vue -->
<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            🎫 Rabattverwaltung
          </h1>
          <p class="text-gray-600">
            Verwalten Sie alle verfügbaren Rabatte und Gutscheine für Ihre Kunden
          </p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
        >
          ➕ Neuer Rabatt
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Alle Rabatte</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalDiscounts }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">🎫</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Aktive Rabatte</p>
            <p class="text-2xl font-bold text-green-600">{{ activeDiscounts }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">✅</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Gutscheincodes</p>
            <p class="text-2xl font-bold text-purple-600">{{ codeDiscounts }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">🏷️</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Heute gültig</p>
            <p class="text-2xl font-bold text-orange-600">{{ validToday }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">📅</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Rabattname oder Code suchen..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Typ</label>
          <select
            v-model="selectedType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Typen</option>
            <option value="percentage">Prozentual</option>
            <option value="fixed">Fester Betrag</option>
            <option value="free_lesson">Kostenlose Lektion</option>
            <option value="free_product">Kostenloses Produkt</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Gilt für</label>
          <select
            v-model="selectedAppliesTo"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            <option value="all">Alle</option>
            <option value="appointments">Nur Termine</option>
            <option value="products">Nur Produkte</option>
            <option value="services">Nur Services</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            <option value="active">Nur aktive</option>
            <option value="inactive">Nur inaktive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Discounts Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rabatt
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Typ
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wert
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gültigkeit
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verwendung
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="discount in filteredDiscounts" 
              :key="discount.id" 
              class="hover:bg-gray-50 cursor-pointer"
              @click="editDiscount(discount)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ discount.name }}</div>
                  <div v-if="discount.code" class="text-sm text-gray-500">
                    Code: <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ discount.code }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getTypeBadgeClass(discount.discount_type)">
                  {{ getTypeLabel(discount.discount_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div v-if="discount.discount_type === 'percentage'">
                  {{ discount.discount_value }}%
                </div>
                <div v-else>
                  CHF {{ (discount.discount_value).toFixed(2) }}
                </div>
                <div v-if="discount.max_discount_rappen" class="text-xs text-gray-500">
                  Max: CHF {{ (discount.max_discount_rappen / 100).toFixed(2) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>Ab: {{ formatDate(discount.valid_from) }}</div>
                <div v-if="discount.valid_until" class="text-gray-500">
                  Bis: {{ formatDate(discount.valid_until) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>{{ discount.usage_count }}x verwendet</div>
                <div v-if="discount.usage_limit" class="text-gray-500">
                  von {{ discount.usage_limit }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="discount.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ discount.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" @click.stop>
                <div class="flex justify-end space-x-2">
                  <button
                    @click="editDiscount(discount)"
                    class="text-blue-600 hover:text-blue-900 p-1"
                    title="Bearbeiten"
                  >
                    ✏️
                  </button>
                  <button
                    @click="toggleDiscountStatus(discount)"
                    :class="discount.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'"
                    class="p-1"
                    :title="discount.is_active ? 'Deaktivieren' : 'Aktivieren'"
                  >
                    {{ discount.is_active ? '🚫' : '✅' }}
                  </button>
                  <button
                    @click="deleteDiscount(discount.id)"
                    class="text-red-600 hover:text-red-900 p-1"
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <DiscountEditorModal
      v-if="showModal"
      :discount="editingDiscount"
      :is-edit="!!editingDiscount"
      @close="closeModal"
      @saved="handleDiscountSaved"
    />
  </div>
</template>

<script setup lang="ts">
// Page meta
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

import { ref, computed, onMounted } from 'vue'
import { useDiscounts } from '~/composables/useDiscounts'
import type { Discount } from '~/types/payment'

// Composables
const { 
  discounts, 
  isLoading, 
  loadDiscounts, 
  updateDiscount, 
  deleteDiscount: deleteDiscountFromDB 
} = useDiscounts()

// Additional State
const searchTerm = ref('')
const selectedType = ref('')
const selectedAppliesTo = ref('')
const selectedStatus = ref('')
const showModal = ref(false)
const editingDiscount = ref<Discount | null>(null)

// Computed
const totalDiscounts = computed(() => discounts.value.length)
const activeDiscounts = computed(() => discounts.value.filter(d => d.is_active).length)
const codeDiscounts = computed(() => discounts.value.filter(d => d.code).length)
const validToday = computed(() => {
  const today = new Date()
  return discounts.value.filter(d => {
    if (!d.is_active) return false
    const validFrom = new Date(d.valid_from)
    const validUntil = d.valid_until ? new Date(d.valid_until) : null
    return today >= validFrom && (!validUntil || today <= validUntil)
  }).length
})

const filteredDiscounts = computed(() => {
  return discounts.value.filter(discount => {
    // Search filter
    if (searchTerm.value && !discount.name.toLowerCase().includes(searchTerm.value.toLowerCase()) && 
        !(discount.code && discount.code.toLowerCase().includes(searchTerm.value.toLowerCase()))) {
      return false
    }
    
    // Type filter
    if (selectedType.value && discount.discount_type !== selectedType.value) {
      return false
    }
    
    // Applies to filter
    if (selectedAppliesTo.value && discount.applies_to !== selectedAppliesTo.value) {
      return false
    }
    
    // Status filter
    if (selectedStatus.value === 'active' && !discount.is_active) {
      return false
    }
    if (selectedStatus.value === 'inactive' && discount.is_active) {
      return false
    }
    
    return true
  })
})

// Methods
const loadAllDiscounts = async () => {
  try {
    console.log('🔄 Loading all discounts...')
    await loadDiscounts()
    console.log('✅ Discounts loaded:', discounts.value.length)
  } catch (error) {
    console.error('❌ Error loading discounts:', error)
  }
}

const openCreateModal = () => {
  editingDiscount.value = null
  showModal.value = true
}

const editDiscount = (discount: Discount) => {
  editingDiscount.value = { ...discount }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingDiscount.value = null
}

const handleDiscountSaved = async () => {
  await loadAllDiscounts()
  closeModal()
}

const toggleDiscountStatus = async (discount: Discount) => {
  try {
    await updateDiscount(discount.id, { is_active: !discount.is_active })
    await loadAllDiscounts()
  } catch (error) {
    console.error('Error toggling discount status:', error)
  }
}

const deleteDiscount = async (id: string) => {
  if (!confirm('Sind Sie sicher, dass Sie diesen Rabatt löschen möchten?')) {
    return
  }
  
  try {
    await deleteDiscountFromDB(id)
    await loadAllDiscounts()
  } catch (error) {
    console.error('Error deleting discount:', error)
  }
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    percentage: 'Prozentual',
    fixed: 'Fester Betrag',
    free_lesson: 'Kostenlose Lektion',
    free_product: 'Kostenloses Produkt'
  }
  return labels[type] || type
}

const getTypeBadgeClass = (type: string) => {
  const classes: Record<string, string> = {
    percentage: 'bg-blue-100 text-blue-800',
    fixed: 'bg-green-100 text-green-800',
    free_lesson: 'bg-purple-100 text-purple-800',
    free_product: 'bg-orange-100 text-orange-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH')
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

// Lifecycle
onMounted(() => {
  loadAllDiscounts()
})
</script>
