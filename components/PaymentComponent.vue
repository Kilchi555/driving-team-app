<!-- components/PaymentComponent.vue - ERWEITERTE VERSION -->
<template>
  <div class="payment-component">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
      <h2 class="text-2xl font-bold mb-2">
        {{ isStandalone ? 'Shop & Zahlung' : 'Zahlung für Termin' }}
      </h2>
      <p class="text-blue-100">
        {{ isStandalone ? 'Wählen Sie Produkte und wenden Sie Rabatte an' : 'Produkte und Rabatte für Ihren Termin' }}
      </p>
    </div>

    <!-- Main Content -->
    <div class="p-6 space-y-6">
      <!-- Products Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Produkte</h3>
          <button
            @click="showProductSelector = true"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i class="fas fa-plus mr-2"></i>
            Produkt hinzufügen
          </button>
        </div>

        <!-- Selected Products -->
        <div v-if="hasProducts" class="space-y-3">
          <div
            v-for="product in Array.from(selectedProducts.values())"
            :key="product.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ product.name }}</div>
              <div class="text-sm text-gray-600">{{ product.description }}</div>
            </div>
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <div class="font-medium text-gray-900">
                  {{ formatPrice(product.price_rappen) }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ formatPrice(product.price_rappen) }} × {{ product.quantity }}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  @click="updateProductQuantity(product.id, (product.quantity || 1) - 1)"
                  :disabled="(product.quantity || 1) <= 1"
                  class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center"
                >
                  <i class="fas fa-minus text-sm"></i>
                </button>
                <span class="w-8 text-center">{{ product.quantity || 1 }}</span>
                <button
                  @click="updateProductQuantity(product.id, (product.quantity || 1) + 1)"
                  class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                >
                  <i class="fas fa-plus text-sm"></i>
                </button>
              </div>
              <button
                @click="removeProduct(product.id)"
                class="text-red-600 hover:text-red-800 p-1"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- No Products Message -->
        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-shopping-cart text-4xl mb-3"></i>
          <p>Keine Produkte ausgewählt</p>
        </div>
      </div>

      <!-- Discounts Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Rabatte</h3>
          <button
            @click="showDiscountSelector = true"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <i class="fas fa-tag mr-2"></i>
            Rabatt hinzufügen
          </button>
        </div>

        <!-- Discount Code Input -->
        <div class="mb-4">
          <div class="flex space-x-2">
            <input
              v-model="discountCode"
              type="text"
              placeholder="Gutscheincode eingeben"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              @click="applyDiscountCode"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Anwenden
            </button>
          </div>
          <!-- Error Message -->
          <div v-if="errorMessage" class="mt-2 text-red-600 text-sm">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Applied Discounts -->
        <div v-if="hasDiscounts" class="space-y-3">
          <div
            v-for="discount in Array.from(appliedDiscounts.values())"
            :key="discount.id"
            class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
          >
            <div class="flex-1">
              <div class="font-medium text-green-900">{{ discount.name }}</div>
              <div class="text-sm text-green-600">
                {{ discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `CHF ${discount.discount_value}` }}
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-green-900">
                -{{ formatPrice(discount.discount_amount_rappen) }}
              </div>
            </div>
            <button
              @click="removeDiscount(discount.id)"
              class="ml-3 text-green-600 hover:text-green-800"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- No Discounts Message -->
        <div v-else class="text-center py-8 text-gray-500">
          <i class="fas fa-tag text-4xl mb-3"></i>
          <p>Keine Rabatte angewendet</p>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Zusammenfassung</h3>
        
        <div class="space-y-3">
          <div class="flex justify-between text-gray-600">
            <span>Zwischensumme:</span>
            <span>{{ formatPrice(subtotalRappen) }}</span>
          </div>
          
          <div v-if="totalDiscountRappen > 0" class="flex justify-between text-green-600">
            <span>Rabatt:</span>
            <span>-{{ formatPrice(totalDiscountRappen) }}</span>
          </div>
          
          <div class="flex justify-between text-lg font-bold text-gray-900 border-t pt-3">
            <span>Gesamt:</span>
            <span>{{ formatPrice(finalTotalRappen) }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Method Selection -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Zahlungsmethode</h3>
        
        <select
          v-model="selectedPaymentMethod"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option v-for="method in paymentMethods" :key="method.value" :value="method.value">
            {{ method.label }}
          </option>
        </select>
      </div>

      <!-- Payment Actions -->
      <div class="flex space-x-4">
        <button
          @click="processPayment"
          :disabled="!canProcessPayment || isLoadingOverlay"
          class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoadingOverlay">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Zahlung wird verarbeitet...
          </span>
          <span v-else>
            <i class="fas fa-credit-card mr-2"></i>
            Zahlung abschließen
          </span>
        </button>
        
        <button
          @click="$emit('cancel')"
          class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-lg font-medium text-gray-900">Zahlung wird verarbeitet...</p>
        <p class="text-gray-600">Bitte warten Sie einen Moment</p>
      </div>
    </div>

    <!-- Modals -->
    <ProductSelectorModal
      v-if="showProductSelector"
      :initial-products="Array.from(selectedProducts.values())"
      @products-selected="handleProductsSelected"
      @close="showProductSelector = false"
    />

    <DiscountSelectorModal
      v-if="showDiscountSelector"
      :initial-discounts="Array.from(appliedDiscounts.values())"
      @discounts-selected="handleDiscountsSelected"
      @close="showDiscountSelector = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePayments } from '~/composables/usePayments'
import { useDiscounts } from '~/composables/useDiscounts'
import type { Product, Discount, PaymentMethod, PaymentStatus } from '~/types/payment'

// Props
interface Props {
  appointmentId?: string
  userId?: string
  staffId?: string
  categoryCode?: string
  initialProducts?: Product[]
  initialDiscounts?: Discount[]
  isStandalone?: boolean
  paymentMethods?: { value: PaymentMethod; label: string; icon: string }[]
}

const props = withDefaults(defineProps<Props>(), {
  isStandalone: false,
  paymentMethods: () => [
    { value: 'cash', label: 'Bar', icon: '💰' },
    { value: 'invoice', label: 'Rechnung', icon: '📄' },
    { value: 'wallee', label: 'Online-Zahlung', icon: '💳' }
  ]
})

// Emits
const emit = defineEmits<{
  'payment-created': [payment: any]
  'payment-failed': [error: string]
  'products-selected': [products: Product[]]
  'discounts-selected': [discounts: Discount[]]
  'cancel': []
}>()

// Composables
const { createStandalonePayment, processCashPayment, processInvoicePayment, isLoading, isProcessing } = usePayments()

// State
const showProductSelector = ref(false)
const showDiscountSelector = ref(false)
const selectedProducts = ref<Map<string, Product & { quantity: number }>>(new Map())
const appliedDiscounts = ref<Map<string, Discount & { discount_amount_rappen: number }>>(new Map())
const selectedPaymentMethod = ref<PaymentMethod>('cash')
const discountCode = ref<string>('')
const isLoadingOverlay = ref(false)
const errorMessage = ref<string>('')

// Computed
const subtotalRappen = computed(() => {
  return Array.from(selectedProducts.value.values()).reduce((sum, product) => {
    return sum + (product.price_rappen * (product.quantity || 1))
  }, 0)
})

const totalDiscountRappen = computed(() => {
  return Array.from(appliedDiscounts.value.values()).reduce((sum, discount) => {
    return sum + (discount.discount_amount_rappen || 0)
  }, 0)
})

const finalTotalRappen = computed(() => {
  return subtotalRappen.value - totalDiscountRappen.value
})

const hasProducts = computed(() => selectedProducts.value.size > 0)
const hasDiscounts = computed(() => appliedDiscounts.value.size > 0)
const canProcessPayment = computed(() => hasProducts.value && finalTotalRappen.value > 0)

// Methods
const addProduct = (product: Product) => {
  const existingProduct = selectedProducts.value.get(product.id)
  if (existingProduct) {
    existingProduct.quantity = (existingProduct.quantity || 1) + 1
    selectedProducts.value.set(product.id, { ...existingProduct })
  } else {
    selectedProducts.value.set(product.id, { ...product, quantity: 1 })
  }
  emitProductsSelected()
}

const removeProduct = (productId: string) => {
  selectedProducts.value.delete(productId)
  emitProductsSelected()
}

const updateProductQuantity = (productId: string, quantity: number) => {
  const product = selectedProducts.value.get(productId)
  if (product) {
    product.quantity = Math.max(1, quantity)
    selectedProducts.value.set(productId, { ...product })
    emitProductsSelected()
  }
}

const addDiscount = (discount: Discount) => {
  // Calculate discount amount based on discount type and current subtotal
  let discountAmount = 0
  if (discount.discount_type === 'percentage') {
    discountAmount = Math.round((subtotalRappen.value * discount.discount_value) / 100)
  } else if (discount.discount_type === 'fixed') {
    discountAmount = discount.discount_value * 100 // Convert CHF to Rappen
  }
  
  // Apply max discount limit if set
  if (discount.max_discount_rappen && discountAmount > discount.max_discount_rappen) {
    discountAmount = discount.max_discount_rappen
  }
  
  appliedDiscounts.value.set(discount.id, { 
    ...discount, 
    discount_amount_rappen: discountAmount 
  })
  emitDiscountsSelected()
}

const removeDiscount = (discountId: string) => {
  appliedDiscounts.value.delete(discountId)
  emitDiscountsSelected()
}

const applyDiscountCode = async () => {
  if (!discountCode.value.trim()) return
  
  try {
    isLoadingOverlay.value = true
    
    // Validate discount code using the new discounts composable
    const { validateDiscountCode } = useDiscounts()
    const result = await validateDiscountCode(
      discountCode.value.trim(),
      subtotalRappen.value,
      props.categoryCode
    )
    
    if (result.isValid && result.discount) {
      // Add discount to applied discounts
      appliedDiscounts.value.set(result.discount.id, {
        ...result.discount,
        discount_amount_rappen: result.discount_amount_rappen
      })
      
      console.log('✅ Discount code applied:', result.discount.name)
      discountCode.value = ''
      
      // Emit updated discounts
      emitDiscountsSelected()
    } else {
      // Show error message
      errorMessage.value = result.error || 'Gutscheincode ungültig'
      setTimeout(() => {
        errorMessage.value = ''
      }, 3000)
    }
  } catch (error) {
    console.error('Error applying discount code:', error)
    errorMessage.value = 'Fehler bei der Gutscheinprüfung'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  } finally {
    isLoadingOverlay.value = false
  }
}

const handleProductsSelected = (products: (Product & { quantity?: number })[]) => {
  selectedProducts.value.clear()
  products.forEach(product => {
    selectedProducts.value.set(product.id, { ...product, quantity: product.quantity || 1 })
  })
  showProductSelector.value = false
}

const handleDiscountsSelected = (discounts: Discount[]) => {
  appliedDiscounts.value.clear()
  discounts.forEach(discount => {
    // Calculate discount amount
    let discountAmount = 0
    if (discount.discount_type === 'percentage') {
      discountAmount = Math.round((subtotalRappen.value * discount.discount_value) / 100)
    } else if (discount.discount_type === 'fixed') {
      discountAmount = discount.discount_value * 100
    }
    
    if (discount.max_discount_rappen && discountAmount > discount.max_discount_rappen) {
      discountAmount = discount.max_discount_rappen
    }
    
    appliedDiscounts.value.set(discount.id, { 
      ...discount, 
      discount_amount_rappen: discountAmount 
    })
  })
  showDiscountSelector.value = false
}

const emitProductsSelected = () => {
  emit('products-selected', Array.from(selectedProducts.value.values()))
}

const emitDiscountsSelected = () => {
  emit('discounts-selected', Array.from(appliedDiscounts.value.values()))
}

const processPayment = async () => {
  if (!props.userId || finalTotalRappen.value <= 0) {
    emit('payment-failed', 'Ungültige Zahlungsdaten')
    return
  }

  isLoadingOverlay.value = true

  try {
    let payment

    if (props.isStandalone) {
      // Standalone payment (no appointment)
      payment = await createStandalonePayment(
        props.userId,
        props.staffId || '',
        Array.from(selectedProducts.value.values()),
        Array.from(appliedDiscounts.value.values()),
        selectedPaymentMethod.value
      )
    } else if (props.appointmentId) {
      // Appointment-based payment
      const price = {
        total_rappen: finalTotalRappen.value,
        category_code: 'B', // TODO: Get from appointment
        duration_minutes: 45 // TODO: Get from appointment
      }

      if (selectedPaymentMethod.value === 'cash') {
        payment = await processCashPayment(
          props.appointmentId,
          props.userId,
          props.staffId || '',
          price,
          Array.from(selectedProducts.value.values()),
          Array.from(appliedDiscounts.value.values())
        )
      } else if (selectedPaymentMethod.value === 'invoice') {
        payment = await processInvoicePayment(
          props.appointmentId,
          props.userId,
          props.staffId || '',
          price,
          {}, // invoiceData
          Array.from(selectedProducts.value.values()),
          Array.from(appliedDiscounts.value.values())
        )
      } else {
        // TODO: Handle other payment methods (Wallee, etc.)
        throw new Error('Zahlungsmethode noch nicht implementiert')
      }
    } else {
      throw new Error('Keine gültige Zahlungskonfiguration')
    }

    emit('payment-created', payment)
  } catch (error: any) {
    console.error('Payment processing error:', error)
    emit('payment-failed', error.message || 'Fehler bei der Zahlungsverarbeitung')
  } finally {
    isLoadingOverlay.value = false
  }
}

const formatPrice = (rappen: number): string => {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

// Watch for prop changes
watch(() => props.initialProducts, (newProducts) => {
  if (newProducts) {
    selectedProducts.value.clear()
    newProducts.forEach(product => {
      selectedProducts.value.set(product.id, { ...product, quantity: 1 })
    })
  }
}, { deep: true })

watch(() => props.initialDiscounts, (newDiscounts) => {
  if (newDiscounts) {
    appliedDiscounts.value.clear()
    newDiscounts.forEach(discount => {
      appliedDiscounts.value.set(discount.id, { 
        ...discount, 
        discount_amount_rappen: 0 
      })
    })
  }
}, { deep: true })

// Initialize from props
onMounted(() => {
  if (props.initialProducts) {
    props.initialProducts.forEach(product => {
      selectedProducts.value.set(product.id, { ...product, quantity: 1 })
    })
  }
  
  if (props.initialDiscounts) {
    props.initialDiscounts.forEach(discount => {
      appliedDiscounts.value.set(discount.id, { 
        ...discount, 
        discount_amount_rappen: 0 
      })
    })
  }
})
</script>

<style scoped>
.payment-component {
  @apply max-w-4xl mx-auto;
}

.fas {
  @apply inline-block;
}
</style>