<template>
  <div class="payment-display">
    <!-- Loading State -->
    <div v-if="isCalculating" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Preis wird berechnet...</span>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      :title="error"
      class="mb-4"
    />

    <!-- Payment Display -->
    <div v-else class="space-y-6">
      
      <!-- Header -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          💰 Zahlung für Fahrstunde
        </h3>
        <p class="text-sm text-gray-500" v-if="appointmentData">
          {{ appointmentData.title || 'Fahrstunde' }} • {{ formatDate(appointmentData.start_time) }}
        </p>
      </div>

      <!-- Price Breakdown -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calculator" class="w-5 h-5 text-blue-600" />
            <span class="font-semibold">Preisaufstellung</span>
          </div>
        </template>

        <div class="space-y-3">
          <!-- Product Info -->
          <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <div>
              <div class="font-medium text-gray-900">
                {{ getProductName() }}
              </div>
              <div class="text-sm text-gray-500">
                Kategorie {{ category }} • {{ duration }}min
                <span v-if="appointmentNumber > 1" class="ml-1">
                  ({{ appointmentNumber }}. Termin)
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">
                CHF {{ formatPrice(basePrice) }}
              </div>
              <div class="text-xs text-gray-500">
                CHF {{ formatPrice(pricePerMinute) }}/min
              </div>
            </div>
          </div>

          <!-- Discount (if applicable) -->
          <div 
            v-if="discount.amount > 0" 
            class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-tag" class="w-4 h-4 text-green-600" />
              <div>
                <div class="font-medium text-green-800">
                  Rabatt {{ discount.type === 'percentage' ? `(${discount.amount}%)` : '' }}
                </div>
                <div class="text-sm text-green-600" v-if="discount.reason">
                  {{ discount.reason }}
                </div>
              </div>
            </div>
            <div class="text-lg font-semibold text-green-700">
              -CHF {{ formatPrice(discount.calculatedAmount) }}
            </div>
          </div>

          <!-- Admin Fee (if applicable) -->
          <div 
            v-if="adminFee > 0" 
            class="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-yellow-600" />
              <div>
                <div class="font-medium text-yellow-800">
                  Versicherungspauschale
                </div>
                <div class="text-sm text-yellow-600">
                  Ab 2. Fahrstunde (einmalig)
                </div>
              </div>
            </div>
            <div class="text-lg font-semibold text-yellow-700">
              CHF {{ formatPrice(adminFee) }}
            </div>
          </div>

          <!-- Total -->
          <div class="border-t pt-3">
            <div class="flex justify-between items-center">
              <div class="text-xl font-bold text-gray-900">
                Total zu zahlen:
              </div>
              <div class="text-2xl font-bold text-blue-600">
                CHF {{ formatPrice(totalAmount) }}
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Payment Methods -->
      <UCard v-if="showPaymentMethods && !appointmentData?.is_paid">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-blue-600" />
            <span class="font-semibold">Zahlungsmethode wählen</span>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- Online Payment -->
          <UButton
            @click="handlePaymentMethod('wallee')"
            :loading="processingMethod === 'wallee'"
            :disabled="isProcessingPayment"
            color="blue"
            variant="solid"
            size="lg"
            class="h-20 flex-col justify-center"
          >
            <UIcon name="i-heroicons-credit-card" class="w-6 h-6 mb-1" />
            <span class="text-sm font-medium">Online bezahlen</span>
            <span class="text-xs opacity-75">Karte, Twint, etc.</span>
          </UButton>

          <!-- Cash Payment -->
          <UButton
            @click="handlePaymentMethod('cash')"
            :loading="processingMethod === 'cash'"
            :disabled="isProcessingPayment"
            color="yellow"
            variant="solid"
            size="lg"
            class="h-20 flex-col justify-center"
          >
            <UIcon name="i-heroicons-banknotes" class="w-6 h-6 mb-1" />
            <span class="text-sm font-medium">Bar bezahlen</span>
            <span class="text-xs opacity-75">Beim Fahrlehrer</span>
          </UButton>

          <!-- Invoice -->
          <UButton
            @click="handlePaymentMethod('invoice')"
            :loading="processingMethod === 'invoice'"
            :disabled="isProcessingPayment"
            color="gray"
            variant="solid"
            size="lg"
            class="h-20 flex-col justify-center"
          >
            <UIcon name="i-heroicons-document" class="w-6 h-6 mb-1" />
            <span class="text-sm font-medium">Rechnung</span>
            <span class="text-xs opacity-75">Firmenrechnung</span>
          </UButton>
        </div>
      </UCard>

      <!-- Already Paid Status -->
      <UAlert
        v-if="appointmentData?.is_paid"
        icon="i-heroicons-check-circle"
        color="green"
        variant="soft"
        title="Bereits bezahlt"
        description="Diese Fahrstunde wurde bereits bezahlt."
      />

      <!-- Payment Status -->
      <UAlert
        v-if="paymentStatus"
        :icon="paymentStatus.type === 'success' ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
        :color="paymentStatus.type === 'success' ? 'green' : 'red'"
        variant="soft"
        :title="paymentStatus.title"
        :description="paymentStatus.message"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePayments } from '~/composables/usePayments'
import { useWallee } from '~/composables/useWallee'
import { useCategoryData } from '~/composables/useCategoryData'
import { formatDate } from '~/utils/dateUtils'

// Props
interface Props {
  appointmentData?: any
  category: string
  duration: number
  userId?: string
  staffId?: string
  appointmentNumber?: number
  showPaymentMethods?: boolean
  discount?: {
    amount: number
    type: 'fixed' | 'percentage'
    reason?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  duration: 45,
  appointmentNumber: 1,
  showPaymentMethods: true,
  discount: () => ({ amount: 0, type: 'fixed', reason: '' })
})

// Emits
const emit = defineEmits<{
  'payment-success': [data: any]
  'payment-error': [error: string]
  'payment-started': [method: string]
}>()

// Composables
const { 
  calculatePrice, 
  processCashPayment, 
  processInvoicePayment,
  isLoadingPrice,
  isProcessing,
  priceError,
  clearErrors
} = usePayments()

const { createAppointmentPayment } = useWallee()

const { 
  getCategoryName, 
  getCategoryByCode,
  getAdminFee 
} = useCategoryData()

// State - verwende Composable States
const calculatedPriceData = ref<any>(null)
const paymentStatus = ref<any>(null)
const processingMethod = ref<string | null>(null)

// Computed für Preise (direkt aus usePayments)
const isCalculating = computed(() => isLoadingPrice.value)
const error = computed(() => priceError.value)
const isProcessingPayment = computed(() => isProcessing.value)

// Price refs basierend auf calculatedPriceData
const basePrice = computed(() => 
  calculatedPriceData.value ? calculatedPriceData.value.base_price_rappen / 100 : 0
)

const adminFee = computed(() => 
  calculatedPriceData.value ? calculatedPriceData.value.admin_fee_rappen / 100 : 0
)

const pricePerMinute = computed(() => 
  basePrice.value / (props.duration || 45)
)

const totalAmount = computed(() => {
  let total = basePrice.value
  
  // Apply discount
  if (props.discount.amount > 0) {
    if (props.discount.type === 'percentage') {
      total -= (total * props.discount.amount / 100)
    } else {
      total -= props.discount.amount
    }
  }
  
  // Add admin fee
  total += adminFee.value
  
  return Math.max(0, total)
})

const discount = computed(() => {
  if (props.discount.amount <= 0) return { amount: 0, calculatedAmount: 0, type: 'fixed', reason: '' }
  
  let calculatedAmount = 0
  if (props.discount.type === 'percentage') {
    calculatedAmount = basePrice.value * props.discount.amount / 100
  } else {
    calculatedAmount = props.discount.amount
  }
  
  return {
    ...props.discount,
    calculatedAmount
  }
})

// Methods
const calculatePrices = async () => {
  if (!props.category) return
  
  clearErrors()
  
  try {
    const result = await calculatePrice(
      props.category,
      props.duration,
      props.userId
    )
    
    calculatedPriceData.value = result
    
  } catch (err: any) {
    console.error('Error calculating prices:', err)
    
    // Fallback calculation wenn usePayments nicht verfügbar
    const categoryPricing: Record<string, number> = {
      'B': 95, 'A1': 95, 'BE': 120, 'C': 170, 'CE': 200, 'D': 200, 'BPT': 100
    }
    
    const fallbackBasePrice = (categoryPricing[props.category] || 95) * (props.duration / 45)
    const fallbackAdminFee = props.appointmentNumber > 1 ? getAdminFee(props.category) : 0
    
    calculatedPriceData.value = {
      base_price_rappen: Math.round(fallbackBasePrice * 100),
      admin_fee_rappen: Math.round(fallbackAdminFee * 100),
      total_rappen: Math.round((fallbackBasePrice + fallbackAdminFee) * 100),
      category_code: props.category,
      duration_minutes: props.duration
    }
  }
}

const handlePaymentMethod = async (method: string) => {
  if (isProcessingPayment.value || !props.userId || !props.staffId) return
  
  processingMethod.value = method
  paymentStatus.value = null
  
  emit('payment-started', method)
  
  try {
    let result: any
    
    switch (method) {
      case 'wallee':
        if (!props.appointmentData?.id) {
          throw new Error('Appointment ID fehlt für Online-Zahlung')
        }
        
        result = await createAppointmentPayment(
          props.appointmentData,
          { 
            id: props.userId, 
            email: props.appointmentData?.users?.email || props.appointmentData?.user_email 
          },
          props.appointmentNumber > 1
        )
        
        if (result.success && result.paymentUrl) {
          window.location.href = result.paymentUrl
        } else {
          throw new Error(result.error || 'Online-Zahlung fehlgeschlagen')
        }
        break
        
      case 'cash':
        result = await processCashPayment(
          props.appointmentData?.id || 'temp_cash_payment',
          props.userId,
          props.staffId,
          calculatedPriceData.value
        )
        
        paymentStatus.value = {
          type: 'success',
          title: 'Barzahlung erfasst',
          message: 'Die Barzahlung wurde erfolgreich im System erfasst.'
        }
        
        emit('payment-success', result)
        break
        
      case 'invoice':
        const invoiceData = {
          company: props.appointmentData?.users?.company_name || '',
          address: `${props.appointmentData?.users?.street || ''} ${props.appointmentData?.users?.street_nr || ''}`.trim(),
          city: `${props.appointmentData?.users?.zip || ''} ${props.appointmentData?.users?.city || ''}`.trim()
        }
        
        result = await processInvoicePayment(
          props.appointmentData?.id || 'temp_invoice_payment',
          props.userId,
          props.staffId,
          calculatedPriceData.value,
          invoiceData
        )
        
        paymentStatus.value = {
          type: 'success',
          title: 'Rechnung erstellt',
          message: 'Die Rechnung wurde erstellt und wird per E-Mail versendet.'
        }
        
        emit('payment-success', result)
        break
    }
    
  } catch (err: any) {
    console.error('Payment error:', err)
    
    paymentStatus.value = {
      type: 'error',
      title: 'Zahlung fehlgeschlagen',
      message: err.message || 'Ein unbekannter Fehler ist aufgetreten.'
    }
    
    emit('payment-error', err.message)
  } finally {
    processingMethod.value = null
  }
}

const getProductName = () => {
  return `Fahrstunde ${getCategoryName(props.category)}`
}

const formatPrice = (amount: number) => {
  return amount.toFixed(2)
}

// Watchers
watch([() => props.category, () => props.duration, () => props.userId], calculatePrices, { immediate: true })

// Lifecycle
onMounted(() => {
  if (props.category) {
    calculatePrices()
  }
})
</script>