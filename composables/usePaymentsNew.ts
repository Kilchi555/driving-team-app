// Neues, sauberes Payment Composable mit optimiertem Speicher-Workflow
import { ref, computed } from 'vue'
import type { 
  Payment, 
  PaymentItem, 
  PaymentWithItems, 
  CreatePaymentRequest,
  CreatePaymentItemRequest,
  Product,
  Discount
} from '~/types/payment'
import { logger } from '~/utils/logger'

export const usePaymentsNew = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ✅ OPTIMIERTER SPEICHER-WORKFLOW: Termin + Produkte + Rabatte → Payment
  const createAppointmentWithPayment = async (
    appointmentData: {
      title: string
      description?: string
      user_id: string
      staff_id?: string
      location_id?: string
      start_time: string
      end_time: string
      duration_minutes: number
      type: string
      event_type_code: string
      status: string
    },
    products: Product[] = [],
    discounts: Discount[] = [],
    paymentMethod: 'cash' | 'invoice' | 'online' = 'cash'
  ): Promise<{ appointment: any, payment: Payment } | null> => {
    isLoading.value = true
    error.value = null

    try {
      
      logger.debug('🔄 Creating appointment with integrated payment workflow...')
      
      // Use the appointment API endpoint to create both appointment and payment
      const response = await $fetch('/api/appointments/save', {
        method: 'POST',
        body: {
          ...appointmentData,
          paymentMethod,
          products,
          discounts,
          createPayment: true
        }
      }) as any

      if (!response?.success || !response?.data) {
        throw new Error(response?.error || 'Failed to create appointment with payment')
      }

      logger.debug('✅ Appointment and payment created:', response.data)
      return {
        appointment: response.data.appointment,
        payment: response.data.payment
      }

    } catch (err: any) {
      console.error('❌ Error in appointment with payment workflow:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ OPTIMIERTER SPEICHER-WORKFLOW: Nur Produkte + Rabatte → Payment (ohne Termin)
  const createStandaloneProductPayment = async (
    userId: string,
    staffId: string,
    products: Product[],
    discounts: Discount[] = [],
    paymentMethod: 'cash' | 'invoice' | 'online' = 'cash',
    description?: string
  ): Promise<Payment | null> => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('🔄 Creating standalone product payment...')
      
      if (products.length === 0) {
        throw new Error('At least one product is required')
      }

      // Use the standalone product payment endpoint
      return await createProductPayment(userId, staffId, paymentMethod, products, discounts)

    } catch (err: any) {
      console.error('❌ Error in standalone product payment workflow:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ Zahlung erstellen (Termin oder Standalone)
  const createPayment = async (request: CreatePaymentRequest): Promise<Payment | null> => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('💳 Creating payment via API')
      
      const response = await $fetch('/api/payments/manage', {
        method: 'POST',
        body: {
          action: 'create',
          paymentData: request
        }
      }) as any

      if (!response?.success || !response?.data) {
        throw new Error(response?.error || 'Failed to create payment')
      }

      logger.debug('✅ Payment created successfully via API:', response.data)
      return response.data

    } catch (err: any) {
      console.error('❌ Error creating payment:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ Standalone Produkt-Zahlung erstellen
  const createProductPayment = async (
    userId: string,
    staffId: string,
    paymentMethod: 'cash' | 'invoice' | 'online',
    products: Product[],
    discounts: Discount[] = []
  ): Promise<Payment | null> => {
    
    const items: CreatePaymentItemRequest[] = []

    // 1. Produkte hinzufügen
    products.forEach(product => {
      items.push({
        item_type: 'product',
        item_id: product.id,
        item_name: product.name,
        quantity: 1,
        unit_price_rappen: product.price_rappen,
        description: product.name
      })
    })

    // 2. Rabatte hinzufügen
    const totalProductsValue = products.reduce((sum, p) => sum + p.price_rappen, 0)
    discounts.forEach(discount => {
      const discountAmount = discount.discount_type === 'percentage' 
        ? (totalProductsValue * discount.discount_value / 10000)
        : (discount.discount_value * 100)

      items.push({
        item_type: 'discount',
        item_id: discount.id,
        item_name: `Rabatt: ${discount.name}`,
        quantity: 1,
        unit_price_rappen: -discountAmount,
        description: `Rabatt: ${discount.name}`
      })
    })

    // 3. Payment erstellen
    return createPayment({
      user_id: userId,
      staff_id: staffId,
      payment_method: paymentMethod,
      items,
      description: `Produktzahlung: ${products.map(p => p.name).join(', ')}`
    })
  }

  // ✅ Zahlung als bezahlt markieren
  const markPaymentAsCompleted = async (paymentId: string): Promise<boolean> => {
    try {
      const response = await $fetch('/api/payments/manage', {
        method: 'POST',
        body: {
          action: 'mark-completed',
          paymentId
        }
      }) as any

      if (!response?.success) throw new Error(response?.error || 'Failed to mark payment as completed')

      logger.debug('✅ Payment marked as completed')
      return true

    } catch (err: any) {
      console.error('❌ Error marking payment as completed:', err)
      error.value = err.message
      return false
    }
  }

  // ✅ Zahlung löschen
  const deletePayment = async (paymentId: string): Promise<boolean> => {
    try {
      const response = await $fetch('/api/payments/manage', {
        method: 'POST',
        body: {
          action: 'delete',
          paymentId
        }
      }) as any

      if (!response?.success) throw new Error(response?.error || 'Failed to delete payment')

      logger.debug('✅ Payment deleted')
      return true

    } catch (err: any) {
      console.error('❌ Error deleting payment:', err)
      error.value = err.message
      return false
    }
  }

  // ✅ Zahlungen für einen Benutzer laden
  const loadUserPayments = async (userId: string): Promise<PaymentWithItems[]> => {
    try {
      const response = await $fetch('/api/payments/manage', {
        method: 'POST',
        body: {
          action: 'load-user',
          userId
        }
      }) as any

      if (!response?.success || !Array.isArray(response?.data)) {
        throw new Error(response?.error || 'Failed to load user payments')
      }

      return response.data

    } catch (err: any) {
      console.error('❌ Error loading user payments:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Zahlungen für einen Termin laden
  const loadAppointmentPayments = async (appointmentId: string): Promise<PaymentWithItems[]> => {
    try {
      const response = await $fetch('/api/payments/manage', {
        method: 'POST',
        body: {
          action: 'load-appointment',
          appointmentId
        }
      }) as any

      if (!response?.success || !Array.isArray(response?.data)) {
        throw new Error(response?.error || 'Failed to load appointment payments')
      }

      return response.data

    } catch (err: any) {
      console.error('❌ Error loading appointment payments:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Alle aktiven Produkte laden
  const loadProducts = async (): Promise<Product[]> => {
    try {
      const response = await $fetch('/api/products/get-active', {
        method: 'GET'
      }) as any

      if (!response?.success || !Array.isArray(response?.data)) {
        throw new Error(response?.error || 'Failed to load products')
      }

      return response.data

    } catch (err: any) {
      console.error('❌ Error loading products:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Alle aktiven Rabatte laden
  const loadDiscounts = async (): Promise<Discount[]> => {
    try {
      const response = await $fetch('/api/discounts/get-active', {
        method: 'GET'
      }) as any

      if (!response?.success || !Array.isArray(response?.data)) {
        throw new Error(response?.error || 'Failed to load discounts')
      }

      return response.data

    } catch (err: any) {
      console.error('❌ Error loading discounts:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Hilfsfunktionen
  const getAppointment = async (appointmentId: string) => {
    try {
      const response = await $fetch('/api/appointments/get-appointment-info', {
        method: 'POST',
        body: {
          action: 'get-by-id',
          appointmentId
        }
      }) as any

      if (!response?.success) return null
      return response.data

    } catch (err: any) {
      console.error('❌ Error loading appointment:', err)
      return null
    }
  }

  // ✅ Computed Properties
  const hasError = computed(() => !!error.value)
  const isProcessing = computed(() => isLoading.value)

  return {
    // State
    isLoading,
    error,
    
    // Computed
    hasError,
    isProcessing,
    
    // Methods
    createAppointmentWithPayment,
    createStandaloneProductPayment,
    createPayment,
    createProductPayment,
    markPaymentAsCompleted,
    deletePayment,
    loadUserPayments,
    loadAppointmentPayments,
    loadProducts,
    loadDiscounts
  }
}
