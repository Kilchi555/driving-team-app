<!-- components/PaymentComponent.vue - MOBILE-OPTIMIERTE VERSION -->
<template>
  <div class="payment-component">

    <!-- Main Content -->
    <div class="space-y-3 sm:space-y-4">
      <!-- Products Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-gray-900">Produkte</h3>
        </div>

        <!-- Selected Products -->
        <div v-if="hasProducts" class="space-y-2">
          <div
            v-for="product in Array.from(selectedProducts.values())"
            :key="product.id"
            class="bg-gray-50 rounded-lg p-2 sm:p-3"
          >
            <!-- Mobile Layout: Stacked -->
            <div class="block sm:hidden">
              <div class="flex justify-between items-start mb-2">
                <div class="flex-1 pr-2">
                  <div class="font-medium text-gray-900 text-sm">{{ product.name }}</div>
                  <div class="text-xs text-gray-600 mt-1">{{ product.description }}</div>
                </div>
                <button
                  @click="removeProduct(product.id)"
                  class="text-red-600 hover:text-red-800 p-1 -mt-1"
                >
                  <span class="text-sm">🗑</span>
                </button>
              </div>
              
              <div class="flex justify-between items-center">
                <div class="text-right">
                  <div class="text-md font-bold text-gray-500">
                    {{ formatPrice(product.price_rappen) }} × {{ product.quantity }}
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    @click="updateProductQuantity(product.id, (product.quantity || 1) - 1)"
                    :disabled="(product.quantity || 1) <= 1"
                    class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center touch-manipulation"
                  >
                    <span class="text-lg text-red-600 font-bold">−</span>
                  </button>
                  <span class="w-6 text-center font-medium text-sm">{{ product.quantity || 1 }}</span>
                  <button
                    @click="updateProductQuantity(product.id, (product.quantity || 1) + 1)"
                    class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center touch-manipulation"
                  >
                    <span class="text-lg text-green-600 font-bold">+</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Desktop Layout: Horizontal -->
            <div class="hidden sm:flex items-center justify-between">
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ product.name }}</div>
                <div class="text-sm text-gray-600">{{ product.description }}</div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="text-center">
                  <div class="text-md text-gray-500">
                   x {{ product.quantity }}
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    @click="updateProductQuantity(product.id, (product.quantity || 1) - 1)"
                    :disabled="(product.quantity || 1) <= 1"
                    class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center"
                  >
                    <span class="text-lg text-red-600 font-bold">−</span>
                  </button>
                  <span class="w-8 text-center">{{ product.quantity || 1 }}</span>
                  <button
                    @click="updateProductQuantity(product.id, (product.quantity || 1) + 1)"
                    class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <span class="text-lg text-green-600 font-bold">+</span>
                  </button>
                </div>
                <button
                  @click="removeProduct(product.id)"
                  class="text-red-600 hover:text-red-800 p-1"
                >
                  <span>🗑</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- No Products Message -->
        <div v-else class="text-center py-4 text-gray-500">
          <div class="text-4xl mb-2">🛒</div>
          <p>Keine Produkte ausgewählt</p>
        </div>
      </div>

      <!-- Discounts Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-gray-900">Rabatte</h3>
        </div>

        <!-- Discount Code Input - Only show if not in read-only mode -->
        <div v-if="!isReadOnly" class="mb-3">
          <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              v-model="discountCode"
              type="text"
              placeholder="Gutscheincode eingeben"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
            <button
              @click="applyDiscountCode"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors touch-manipulation font-medium"
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
        <div v-if="hasDiscounts" class="space-y-2">
          <div
            v-for="discount in Array.from(appliedDiscounts.values())"
            :key="discount.id"
            class="bg-green-50 rounded-lg border border-green-200 p-2 sm:p-3"
          >
            <!-- Mobile Layout: Stacked -->
            <div class="block sm:hidden">
              <div class="flex justify-between items-start">
                <div class="flex-1 pr-2">
                  <div class="font-medium text-green-900 text-sm">{{ discount.name }}</div>

                </div>
                <button
                  @click="removeDiscount(discount.id)"
                  class="text-red-600 hover:text-green-800 -mt-4"
                >
                  <span class="text-sm">✕</span>
                </button>
              </div>
              <div class="text-right">
                <div class="font-medium text-green-900 text-sm">
                  -{{ formatPrice(discount.discount_amount_rappen) }}
                </div>
              </div>
            </div>

            <!-- Desktop Layout: Horizontal -->
            <div class="hidden sm:flex items-center justify-between">
              <div class="flex-1">
                <div class="font-medium text-green-900">{{ discount.name }}</div>
                <div class="text-sm text-green-600">
                  {{ discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `CHF ${discount.discount_value}` }} Rabatt
                </div>
              </div>
              <div class="text-right">
                <div class="font-medium text-green-900">
                  - {{ formatPrice(discount.discount_amount_rappen) }}
                </div>
              </div>
              <button
                @click="removeDiscount(discount.id)"
                class="ml-3 text-green-600 hover:text-green-800 p-1"
              >
                <span>✕</span>
              </button>
            </div>
          </div>
        </div>

        <!-- No Discounts Message -->
        <div v-else class="text-center py-4 text-gray-500">
          <div class="text-4xl mb-2">🏷️</div>
          <p>Keine Rabatte angewendet</p>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Zusammenfassung</h3>
        
        <div class="space-y-2">
          <div class="flex justify-between text-gray-600 text-sm sm:text-base">
            <span>Zwischensumme:</span>
            <span class="font-medium">{{ formatPrice(subtotalRappen) }}</span>
          </div>
          
          <div v-if="totalDiscountRappen > 0" class="flex justify-between text-green-600 text-sm sm:text-base">
            <span>Rabatt:</span>
            <span class="font-medium">-{{ formatPrice(totalDiscountRappen) }}</span>
          </div>
          
          <div class="flex justify-between text-lg sm:text-xl font-bold text-gray-900 border-t pt-2">
            <span>Gesamt:</span>
            <span>{{ formatPrice(finalTotalRappen) }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Method Selection -->
      <div class="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Zahlungsmethode</h3>
        <p class="text-gray-600">Online-Zahlung</p>
      </div>

      <!-- Payment Actions -->
      <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          @click="processPayment"
          :disabled="!canProcessPayment || isLoadingOverlay"
          class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation font-medium text-base"
        >
          <span v-if="isLoadingOverlay">
            <span class="animate-spin mr-2">⟳</span>
            Zahlung wird verarbeitet...
          </span>
          <span v-else>
            <span class="mr-2">💳</span>
            Zahlung abschließen
          </span>
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-4 sm:p-6 text-center max-w-sm w-full">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p class="text-lg font-medium text-gray-900">Zahlung wird verarbeitet...</p>
        <p class="text-gray-600 text-sm">Bitte warten Sie einen Moment</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
  isReadOnly?: boolean
  paymentMethods?: { value: PaymentMethod; label: string; icon: string }[]
  customerEmail?: string
  customerName?: string
}

const props = withDefaults(defineProps<Props>(), {
  isStandalone: false,
  isReadOnly: false,
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
const { createStandalonePayment, createStandaloneWalleePayment, processCashPayment, processInvoicePayment, processWalleePayment, isLoading, isProcessing } = usePayments()

// State
const showProductSelector = ref(false)
const showDiscountSelector = ref(false)
const selectedProducts = ref<Map<string, Product & { quantity: number }>>(new Map())
const appliedDiscounts = ref<Map<string, Discount & { discount_amount_rappen: number }>>(new Map())
const selectedPaymentMethod = ref<PaymentMethod>(props.isStandalone ? 'wallee' : 'cash')
const discountCode = ref<string>('')
const isLoadingOverlay = ref(false)
const errorMessage = ref<string>('')

// Computed
const subtotalRappen = computed(() => {
  // Always use selectedProducts as the source of truth for real-time updates
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
  // Recalculate discounts when product is added
  recalculateDiscounts()
  // Emit updated discounts to parent
  emitDiscountsSelected()
}

const removeProduct = (productId: string) => {
  selectedProducts.value.delete(productId)
  emitProductsSelected()
  // Recalculate discounts when product is removed
  recalculateDiscounts()
  // Emit updated discounts to parent
  emitDiscountsSelected()
}

const updateProductQuantity = (productId: string, quantity: number) => {
  const product = selectedProducts.value.get(productId)
  if (product) {
    product.quantity = Math.max(1, quantity)
    selectedProducts.value.set(productId, { ...product })
    emitProductsSelected()
    // Recalculate discounts when quantity changes
    recalculateDiscounts()
    // Emit updated discounts to parent
    emitDiscountsSelected()
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
      
      logger.debug('✅ Discount code applied:', result.discount.name)
      
      // Clear discount code after successful application
      setTimeout(() => {
        discountCode.value = ''
      }, 100) // Small delay to ensure UI updates
      
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
  if (finalTotalRappen.value <= 0) {
    emit('payment-failed', 'Ungültige Zahlungsdaten')
    return
  }

  isLoadingOverlay.value = true

  try {
    let payment

    if (props.isStandalone) {
      // Standalone payment (no appointment)
      if (selectedPaymentMethod.value === 'wallee') {
        // For Wallee, we need customer email and name
        const customerEmail = props.customerEmail || 'customer@example.com'
        const customerName = props.customerName || 'Customer'
        
        payment = await createStandaloneWalleePayment(
          props.userId,
          props.staffId || '',
          Array.from(selectedProducts.value.values()),
          Array.from(appliedDiscounts.value.values()),
          customerEmail,
          customerName
        )
      } else {
        payment = await createStandalonePayment(
          props.userId,
          props.staffId || '',
          Array.from(selectedProducts.value.values()),
          Array.from(appliedDiscounts.value.values()),
          selectedPaymentMethod.value
        )
      }
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
      } else if (selectedPaymentMethod.value === 'wallee') {
        // Wallee Online-Zahlung
        payment = await processWalleePayment(
          props.appointmentId,
          props.userId,
          props.staffId || '',
          price,
          Array.from(selectedProducts.value.values()),
          Array.from(appliedDiscounts.value.values())
        )
      } else {
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

// Recalculate all percentage discounts when subtotal changes
const recalculateDiscounts = () => {
  logger.debug('🔄 Recalculating discounts, subtotal:', subtotalRappen.value)
  logger.debug('📋 Applied discounts:', Array.from(appliedDiscounts.value.values()))
  
  appliedDiscounts.value.forEach((discount, discountId) => {
    logger.debug(`🔍 Checking discount ${discount.name}:`, {
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      current_amount: discount.discount_amount_rappen
    })
    
    if (discount.discount_type === 'percentage') {
      // Recalculate percentage discount based on current subtotal
      let newDiscountAmount = Math.round((subtotalRappen.value * discount.discount_value) / 100)
      
      // Apply max discount limit if set
      if (discount.max_discount_rappen && newDiscountAmount > discount.max_discount_rappen) {
        newDiscountAmount = discount.max_discount_rappen
      }
      
      logger.debug(`📊 Recalculating ${discount.name}: ${discount.discount_value}% of ${subtotalRappen.value} = ${newDiscountAmount}`)
      
      // Update the discount amount
      appliedDiscounts.value.set(discountId, {
        ...discount,
        discount_amount_rappen: newDiscountAmount
      })
    } else {
      logger.debug(`💰 Fixed discount ${discount.name}: ${discount.discount_amount_rappen} (no recalculation needed)`)
    }
  })
  
  // Note: Don't emit here to avoid infinite loops
  // emitDiscountsSelected() is called in user actions (addDiscount, removeDiscount)
}

// Watch for prop changes
watch(() => props.initialProducts, (newProducts) => {
  if (newProducts) {
    selectedProducts.value.clear()
    newProducts.forEach(product => {
      selectedProducts.value.set(product.id, { ...product, quantity: product.quantity || 1 })
    })
    // Note: Don't recalculate here to avoid infinite loops
    // recalculateDiscounts() is called in user actions (updateProductQuantity, removeProduct)
    // Note: Don't emit here to avoid infinite loops
    // emitProductsSelected() is called in user actions
  }
}, { deep: true })

// Watch for subtotal changes to recalculate percentage discounts
watch(subtotalRappen, () => {
  // Only recalculate if we have percentage discounts
  const hasPercentageDiscounts = Array.from(appliedDiscounts.value.values()).some(d => d.discount_type === 'percentage')
  if (hasPercentageDiscounts) {
    recalculateDiscounts()
  }
})

// Watch for any changes in selectedProducts to recalculate discounts
watch(selectedProducts, () => {
  // Only recalculate if we have percentage discounts
  const hasPercentageDiscounts = Array.from(appliedDiscounts.value.values()).some(d => d.discount_type === 'percentage')
  if (hasPercentageDiscounts) {
    recalculateDiscounts()
  }
  // Note: Don't emit here to avoid infinite loops
  // emitProductsSelected() is called in updateProductQuantity and removeProduct
}, { deep: true })

watch(() => props.initialDiscounts, (newDiscounts) => {
  if (newDiscounts) {
    appliedDiscounts.value.clear()
    newDiscounts.forEach(discount => {
      appliedDiscounts.value.set(discount.id, { 
        ...discount, 
        discount_amount_rappen: discount.discount_amount_rappen || 0 
      })
    })
    // Note: Don't recalculate here to avoid infinite loops
    // recalculateDiscounts() is called in user actions (addDiscount, removeDiscount)
    // Note: Don't emit here to avoid infinite loops
    // emitDiscountsSelected() is called in user actions
  }
}, { deep: true })

// Initialize from props
onMounted(() => {
  logger.debug('🔄 PaymentComponent mounted, discountCode:', discountCode.value)
  
  if (props.initialProducts) {
    props.initialProducts.forEach(product => {
      selectedProducts.value.set(product.id, { ...product, quantity: product.quantity || 1 })
    })
    // Note: Don't emit here to avoid infinite loops
    // emitProductsSelected() is called in user actions (updateProductQuantity, removeProduct)
  }
  
  if (props.initialDiscounts) {
    appliedDiscounts.value.clear()
    props.initialDiscounts.forEach(discount => {
      appliedDiscounts.value.set(discount.id, { 
        ...discount, 
        discount_amount_rappen: discount.discount_amount_rappen || 0 
      })
    })
    // Note: Don't emit here to avoid infinite loops
    // emitDiscountsSelected() is called in user actions (addDiscount, removeDiscount)
  }

  // Note: Removed auto-clear on save events as it was clearing too frequently
  // The discount code input is now only cleared after successful discount application
})
</script>

<style scoped>
.payment-component {
  @apply max-w-4xl mx-auto;
}

.fas {
  @apply inline-block;
}

/* Mobile-specific improvements */
@media (max-width: 640px) {
  .payment-component {
    @apply mx-0;
  }
  
  /* Ensure touch targets are at least 44px */
  button {
    min-height: 44px;
  }
  
  /* Improve text readability on mobile */
  input, select {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}

/* Touch manipulation for better mobile performance */
.touch-manipulation {
  touch-action: manipulation;
}
</style>