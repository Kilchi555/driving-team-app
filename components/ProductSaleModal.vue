<!-- ProductSaleModal.vue -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[calc(100vh-80px)] flex flex-col overflow-hidden absolute top-4 left-1/2 transform -translate-x-1/2">
      
      <!-- Header -->
      <div class="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 class="text-lg font-semibold text-gray-900">
          📦 Produktverkauf
        </h2>
        <button
          @click="$emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-6 py-6 space-y-6">
          
          <!-- Student Selector -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              👤 Kunde auswählen
            </label>
            <StudentSelector
              ref="studentSelectorRef"
              v-model="selectedStudent"
              :current-user="currentUser"
              :disabled="false"
              :auto-load="true"
              :is-freeslot-mode="false"
              @student-selected="handleStudentSelected"
              @student-cleared="handleStudentCleared"
            />
          </div>

          <!-- Product Selector -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              📦 Produkte auswählen
            </label>
            <div class="space-y-2">
              <button
                @click="productSale.openProductSelector()"
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🛒 Produkte hinzufügen
              </button>
              
              <!-- Selected Products -->
              <div v-if="productSale.hasProducts.value" class="space-y-2">
                <div class="text-sm font-medium text-gray-700">Ausgewählte Produkte:</div>
                <div v-for="item in productSale.selectedProducts.value" :key="item.product.id" 
                     class="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-green-800">{{ item.product.name }}</div>
                    <div class="text-xs text-green-600">{{ item.quantity }}x CHF {{ item.product.price.toFixed(2) }}</div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-bold text-green-800">CHF {{ item.total.toFixed(2) }}</span>
                    <button 
                      @click="productSale.removeProduct(item.product.id)" 
                      class="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Discount Section -->
          <div v-if="productSale.hasProducts.value">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              🏷️ Rabatt (optional)
            </label>
            <div class="space-y-2">
              <div class="flex space-x-2">
                <input
                  v-model="discountAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rabatt in CHF"
                />
                <select
                  v-model="discountType"
                  class="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">CHF</option>
                  <option value="percentage">%</option>
                </select>
              </div>
              <input
                v-model="discountReason"
                type="text"
                class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Grund für Rabatt (optional)"
              />
            </div>
          </div>

          <!-- Payment Method -->
          <div v-if="productSale.hasProducts.value">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              💳 Zahlungsmethode
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  value="cash"
                  class="mr-2"
                />
                <span>💵 Bar</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  value="twint"
                  class="mr-2"
                />
                <span>📱 Twint</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  value="invoice"
                  class="mr-2"
                />
                <span>📄 Rechnung</span>
              </label>
            </div>
          </div>

          <!-- Total -->
          <div v-if="productSale.hasProducts.value" class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-lg font-medium text-gray-900">Gesamtpreis:</span>
              <span class="text-xl font-bold text-gray-900">CHF {{ totalPrice.toFixed(2) }}</span>
            </div>
            <div v-if="discountAmount > 0" class="flex justify-between items-center mt-2 text-sm text-green-600">
              <span>Rabatt:</span>
              <span>- CHF {{ discountAmount.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Error Display -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm text-red-800">❌ {{ error }}</p>
          </div>

          <!-- Loading Display -->
          <div v-if="isLoading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p class="text-sm text-blue-800">💾 Produktverkauf wird gespeichert...</p>
            </div>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="saveProductSale"
          :disabled="!isFormValid || isLoading"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
        >
          <span v-if="isLoading">⏳</span>
          <span v-else>💾 Verkauf speichern</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useProductSales } from '~/composables/useProductSales'
import { useProductSale } from '~/composables/useProductSale'

// Components
import StudentSelector from '~/components/StudentSelector.vue'

interface Props {
  isVisible: boolean
  currentUser?: any
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: false
})

const emit = defineEmits<{
  'close': []
  'sale-created': [saleId: string]
}>()

// Composables
const { createProductSale, isLoading, error } = useProductSales()
const productSale = useProductSale()

// Refs
const studentSelectorRef = ref()
const selectedStudent = ref<any>(null)
const discountAmount = ref(0)
const discountType = ref<'fixed' | 'percentage'>('fixed')
const discountReason = ref('')
const paymentMethod = ref('cash')

// Computed
const totalPrice = computed(() => {
  const basePrice = productSale.totalProductsValue.value
  if (discountAmount.value > 0) {
    if (discountType.value === 'percentage') {
      return basePrice * (1 - discountAmount.value / 100)
    } else {
      return Math.max(0, basePrice - discountAmount.value)
    }
  }
  return basePrice
})

const isFormValid = computed(() => {
  return selectedStudent.value && 
         productSale.hasProducts.value && 
         paymentMethod.value
})

// Methods
const handleStudentSelected = (student: any) => {
  selectedStudent.value = student
  logger.debug('👤 Student selected:', student.first_name)
}

const handleStudentCleared = () => {
  selectedStudent.value = null
  logger.debug('👤 Student cleared')
}

const saveProductSale = async () => {
  if (!isFormValid.value) return

  try {
    logger.debug('💾 Saving product sale...')
    
    const saleData = {
      user_id: selectedStudent.value.id,
      staff_id: props.currentUser.id,
      items: productSale.selectedProducts.value.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price_rappen: Math.round(item.product.price * 100),
        total_price_rappen: Math.round(item.total * 100)
      })),
      discount_amount_rappen: discountAmount.value > 0 ? Math.round(discountAmount.value * 100) : 0,
      discount_type: discountType.value,
      discount_reason: discountReason.value || null,
      payment_method: paymentMethod.value,
      notes: `Produktverkauf ohne Termin - ${new Date().toLocaleDateString('de-CH')}`
    }

    const result = await createProductSale(saleData)
    
    if (result) {
      logger.debug('✅ Product sale created:', result.id)
      emit('sale-created', result.id)
      emit('close')
    } else {
      throw new Error('Failed to create product sale')
    }
    
  } catch (err: any) {
    console.error('❌ Error saving product sale:', err)
  }
}

// Reset form when modal opens
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    selectedStudent.value = null
    productSale.selectedProducts.value = []
    discountAmount.value = 0
    discountType.value = 'fixed'
    discountReason.value = ''
    paymentMethod.value = 'cash'
  }
})
</script>
