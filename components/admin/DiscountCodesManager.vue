<template>
  <div class="bg-white rounded-lg shadow">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-900">
          Rabatt-Codes verwalten
        </h3>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="showCreateModal = true"
        >
          Neuer Rabatt-Code
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
      <!-- Filter -->
      <div class="mb-6 flex space-x-4">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nach Code oder Namen suchen..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <select
          v-model="filterType"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Typen</option>
          <option value="manual">Manuell</option>
          <option value="birthday">Geburtstag</option>
          <option value="anniversary">Jubiläum</option>
          <option value="first_lesson">Erste Fahrstunde</option>
          <option value="milestone">Meilenstein</option>
          <option value="seasonal">Saisonal</option>
        </select>
        <select
          v-model="filterStatus"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"/>
        <p class="mt-2 text-gray-600">Lade Rabatt-Codes...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-8">
        <div class="text-red-600 mb-2">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p class="text-red-600">{{ error }}</p>
        <button
          class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          @click="loadDiscountCodes"
        >
          Erneut versuchen
        </button>
      </div>

      <!-- Discount Codes List -->
      <div v-else-if="filteredDiscountCodes.length > 0" class="space-y-4">
        <div
          v-for="code in filteredDiscountCodes"
          :key="code.id"
          class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ code.code }}
                </span>
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    code.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ code.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getTriggerTypeColor(code.trigger_type)
                  ]"
                >
                  {{ getTriggerTypeLabel(code.trigger_type) }}
                </span>
              </div>
              
              <h4 class="text-lg font-medium text-gray-900 mb-1">
                {{ code.name }}
              </h4>
              
              <p class="text-gray-600 mb-3">{{ code.description }}</p>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">Rabatt:</span>
                  <span class="ml-2 font-medium">
                    {{ code.discount_type === 'percentage' ? `${code.discount_value}%` : `CHF ${code.discount_value}` }}
                  </span>
                </div>
                <div>
                  <span class="text-gray-500">Gültig:</span>
                  <span class="ml-2 font-medium">
                    {{ formatDate(code.valid_from) }} - {{ code.valid_until ? formatDate(code.valid_until) : 'Unbegrenzt' }}
                  </span>
                </div>
                <div>
                  <span class="text-gray-500">Nutzung:</span>
                  <span class="ml-2 font-medium">
                    {{ code.current_total_usage }}/{{ code.max_total_usage === -1 ? '∞' : code.max_total_usage }}
                  </span>
                </div>
                <div>
                  <span class="text-gray-500">Pro Benutzer:</span>
                  <span class="ml-2 font-medium">{{ code.max_per_user }}</span>
                </div>
              </div>

              <!-- Trigger Conditions -->
              <div v-if="Object.keys(code.trigger_conditions).length > 0" class="mt-3 p-2 bg-gray-50 rounded text-xs">
                <span class="text-gray-500">Bedingungen:</span>
                <span class="ml-2 font-mono">{{ JSON.stringify(code.trigger_conditions) }}</span>
              </div>
            </div>

            <div class="flex space-x-2 ml-4">
              <button
                class="p-2 text-gray-400 hover:text-blue-600"
                title="Bearbeiten"
                @click="editCode(code)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                :class="[
                  'p-2',
                  code.is_active 
                    ? 'text-gray-400 hover:text-red-600' 
                    : 'text-gray-400 hover:text-green-600'
                ]"
                :title="code.is_active ? 'Deaktivieren' : 'Aktivieren'"
                @click="toggleCodeStatus(code)"
              >
                <svg v-if="code.is_active" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <div class="text-gray-400 mb-2">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-gray-600">Keine Rabatt-Codes gefunden</p>
        <button
          class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          @click="showCreateModal = true"
        >
          Ersten Rabatt-Code erstellen
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <DiscountCodeModal
      v-if="showCreateModal || editingCode"
      :code="editingCode"
      @close="closeModal"
      @saved="onCodeSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHybridDiscounts } from '~/composables/useHybridDiscounts'
import type { DiscountCode } from '~/composables/useHybridDiscounts'

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const discountCodes = ref<DiscountCode[]>([])
const showCreateModal = ref(false)
const editingCode = ref<DiscountCode | null>(null)

// Filters
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')

// Composables
const { getActiveDiscountCodes, updateDiscountCode, deactivateDiscountCode } = useHybridDiscounts()

// Computed
const filteredDiscountCodes = computed(() => {
  let filtered = discountCodes.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(code => 
      code.code.toLowerCase().includes(query) ||
      code.name.toLowerCase().includes(query) ||
      code.description.toLowerCase().includes(query)
    )
  }

  // Type filter
  if (filterType.value) {
    filtered = filtered.filter(code => code.trigger_type === filterType.value)
  }

  // Status filter
  if (filterStatus.value === 'active') {
    filtered = filtered.filter(code => code.is_active)
  } else if (filterStatus.value === 'inactive') {
    filtered = filtered.filter(code => !code.is_active)
  }

  return filtered
})

// Methods
const loadDiscountCodes = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const codes = await getActiveDiscountCodes()
    discountCodes.value = codes
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Laden der Rabatt-Codes'
    console.error('Error loading discount codes:', err)
  } finally {
    isLoading.value = false
  }
}

const editCode = (code: DiscountCode) => {
  editingCode.value = { ...code }
}

const toggleCodeStatus = async (code: DiscountCode) => {
  try {
    if (code.is_active) {
      await deactivateDiscountCode(code.id)
    } else {
      await updateDiscountCode(code.id, { is_active: true })
    }
    
    // Reload codes
    await loadDiscountCodes()
  } catch (err: any) {
    console.error('Error toggling code status:', err)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingCode.value = null
}

const onCodeSaved = async () => {
  closeModal()
  await loadDiscountCodes()
}

const getTriggerTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    manual: 'Manuell',
    birthday: 'Geburtstag',
    anniversary: 'Jubiläum',
    first_lesson: 'Erste Fahrstunde',
    milestone: 'Meilenstein',
    seasonal: 'Saisonal'
  }
  return labels[type] || type
}

const getTriggerTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    manual: 'bg-gray-100 text-gray-800',
    birthday: 'bg-pink-100 text-pink-800',
    anniversary: 'bg-purple-100 text-purple-800',
    first_lesson: 'bg-green-100 text-green-800',
    milestone: 'bg-yellow-100 text-yellow-800',
    seasonal: 'bg-blue-100 text-blue-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

// Lifecycle
onMounted(() => {
  loadDiscountCodes()
})
</script>
